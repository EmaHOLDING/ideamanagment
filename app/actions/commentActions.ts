"use server";

import { z } from "zod";
import { requireUser, encodeCursor, decodeCursor, resolveAuthorEmails } from "./_shared";
import { createAdminClient } from "@/lib/supabase/admin";

function actorDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName;
  return user.email ?? "Bir kullanıcı";
}

const addCommentSchema = z.object({
  ideaId: z.string().uuid(),
  content: z.string().trim().min(1),
});

export async function addComment(ideaId: string, content: string) {
  const input = addCommentSchema.parse({ ideaId, content });
  const { supabase, user } = await requireUser();

  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .insert({ idea_id: input.ideaId, user_id: user.id, content: input.content })
    .select()
    .single();

  if (commentError) throw commentError;

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("created_by, idea_versions(title, version_number)")
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

  if (recipientIds.size > 0) {
    const latestVersion = idea.idea_versions
      .slice()
      .sort((a, b) => b.version_number - a.version_number)[0];
    const ideaTitle = latestVersion?.title ?? "";

    const admin = createAdminClient();
    const { error: notificationError } = await admin.from("notifications").insert(
      Array.from(recipientIds).map((recipientId) => ({
        user_id: recipientId,
        actor_id: user.id,
        idea_id: input.ideaId,
        message: `${actorDisplayName(user)}, '${ideaTitle}' fikrine yorum yaptı.`,
      }))
    );
    if (notificationError) throw notificationError;
  }

  return comment;
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

  const authorEmailById = await resolveAuthorEmails(data.map((c) => c.user_id));
  const items = data.map((c) => ({ ...c, authorEmail: authorEmailById.get(c.user_id) ?? null }));

  const last = data[data.length - 1];
  const nextCursor =
    data.length === PAGE_SIZE && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  return { items, nextCursor };
}
