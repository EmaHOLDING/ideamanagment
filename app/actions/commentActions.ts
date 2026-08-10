"use server";

import { z } from "zod";
import { requireUser, encodeCursor, decodeCursor, resolveAuthorProfiles, logActivity, getDisplayName } from "./_shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyByEmailIfOffline } from "./_email";
import { mentionEmailHtml } from "@/lib/email-templates";

const addCommentSchema = z.object({
  ideaId: z.string().uuid(),
  content: z.string().trim().min(1),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
});

export async function addComment(ideaId: string, content: string, mentionedUserIds?: string[]) {
  const input = addCommentSchema.parse({ ideaId, content, mentionedUserIds });
  const { supabase, user } = await requireUser();

  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .insert({
      idea_id: input.ideaId,
      user_id: user.id,
      content: input.content,
      mentioned_user_ids: input.mentionedUserIds?.length ? input.mentionedUserIds : null,
    })
    .select()
    .single();

  if (commentError) throw commentError;

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("workspace_id, created_by, idea_versions(title, version_number)")
    .eq("id", input.ideaId)
    .single();

  if (ideaError) throw ideaError;

  const { data: priorCommenters, error: commentersError } = await supabase
    .from("comments")
    .select("user_id")
    .eq("idea_id", input.ideaId);

  if (commentersError) throw commentersError;

  // Bölüm 6.D: fikre daha önce yorum yapmış kullanıcılar + fikri
  // oluşturan kişi, yorumu yapan actor hariç bildirim alır.
  const recipientIds = new Set<string>();
  for (const row of priorCommenters) {
    if (row.user_id !== user.id) recipientIds.add(row.user_id);
  }
  if (idea.created_by && idea.created_by !== user.id) {
    recipientIds.add(idea.created_by);
  }

  const latestVersion = idea.idea_versions
    .slice()
    .sort((a, b) => b.version_number - a.version_number)[0];
  const ideaTitle = latestVersion?.title ?? "";

  if (recipientIds.size > 0) {
    const admin = createAdminClient();
    const { error: notificationError } = await admin.from("notifications").insert(
      Array.from(recipientIds).map((recipientId) => ({
        user_id: recipientId,
        actor_id: user.id,
        idea_id: input.ideaId,
        message: `${getDisplayName(user)}, '${ideaTitle}' fikrine yorum yaptı.`,
      }))
    );
    if (notificationError) throw notificationError;
  }

  const mentionedIds = (input.mentionedUserIds ?? []).filter((id) => id !== user.id);
  if (mentionedIds.length > 0) {
    const admin = createAdminClient();
    const { error: mentionNotificationError } = await admin.from("notifications").insert(
      mentionedIds.map((recipientId) => ({
        user_id: recipientId,
        actor_id: user.id,
        idea_id: input.ideaId,
        message: `${getDisplayName(user)}, '${ideaTitle}' fikrindeki bir yorumda sizi etiketledi.`,
      }))
    );
    if (mentionNotificationError) throw mentionNotificationError;

    const actorName = getDisplayName(user);
    await Promise.all(
      mentionedIds.map((recipientId) =>
        notifyByEmailIfOffline({
          recipientUserId: recipientId,
          subject: `${actorName} sizi bir yorumda etiketledi`,
          html: mentionEmailHtml({
            actorName,
            ideaTitle,
            workspaceId: idea.workspace_id,
            ideaId: input.ideaId,
          }),
        })
      )
    );
  }

  await logActivity(supabase, {
    workspaceId: idea.workspace_id,
    actorId: user.id,
    ideaId: input.ideaId,
    type: "comment_added",
    message: `${getDisplayName(user)}, '${ideaTitle}' fikrine yorum yaptı.`,
  });

  return comment;
}

const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z.string().trim().min(1),
});

export async function updateComment(commentId: string, content: string) {
  const input = updateCommentSchema.parse({ commentId, content });
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("comments")
    .update({ content: input.content, updated_at: new Date().toISOString() })
    .eq("id", input.commentId)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Yalnızca kendi yorumunuzu düzenleyebilirsiniz.");
  }

  return data;
}

const deleteCommentSchema = z.string().uuid();

export async function softDeleteComment(commentId: string) {
  const id = deleteCommentSchema.parse(commentId);
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("soft_delete_comment", { _comment_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu yorumu silme yetkiniz yok.");
    }
    throw error;
  }

  return { success: true as const };
}

export async function undoDeleteComment(commentId: string) {
  const id = deleteCommentSchema.parse(commentId);
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("undo_delete_comment", { _comment_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu yorumu geri yükleme yetkiniz yok.");
    }
    throw error;
  }

  return { success: true as const };
}

const getCommentsSchema = z.object({
  ideaId: z.string().uuid(),
  cursor: z.string().optional(),
});

const PAGE_SIZE = 20;

export async function getComments(ideaId: string, cursor?: string) {
  const input = getCommentsSchema.parse({ ideaId, cursor });
  const { supabase } = await requireUser();

  const decoded = decodeCursor(input.cursor);

  let query = supabase
    .from("comments")
    .select("*")
    .eq("idea_id", input.ideaId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);

  if (decoded) {
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
    );
  }

  const { data, error } = await query;

  if (error) throw error;

  const profileById = await resolveAuthorProfiles(data.map((c) => c.user_id));
  const items = data.map((c) => ({
    ...c,
    authorEmail: profileById.get(c.user_id)?.email ?? null,
    authorFullName: profileById.get(c.user_id)?.fullName ?? null,
  }));

  const last = data[data.length - 1];
  const nextCursor =
    data.length === PAGE_SIZE && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  return { items, nextCursor };
}
