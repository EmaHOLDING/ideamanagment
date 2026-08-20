"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { requireUser, resolveAuthorProfiles, logActivity, getDisplayName, withAuthRetry } from "./_shared";
import { notifyEvent } from "./_notifications";
import { assignmentEmailHtml, ideaMovedEmailHtml } from "@/lib/email-templates";

const impactEffortSchema = z.enum(["LOW", "MEDIUM", "HIGH"]).optional();

const versionDataSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().default(""),
  problemStatement: z.string().trim().optional().nullable(),
  targetAudience: z.string().trim().optional().nullable(),
  impactScore: impactEffortSchema,
  effortScore: impactEffortSchema,
});

export type IdeaVersionData = z.infer<typeof versionDataSchema>;

const createIdeaSchema = z.object({
  workspaceId: z.string().uuid(),
  columnId: z.string().uuid(),
  versionData: versionDataSchema,
});

export async function createIdea(
  workspaceId: string,
  columnId: string,
  versionData: IdeaVersionData
) {
  const input = createIdeaSchema.parse({ workspaceId, columnId, versionData });
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase.rpc("create_idea", {
    _workspace_id: input.workspaceId,
    _column_id: input.columnId,
    _title: input.versionData.title,
    _content: input.versionData.content,
    _problem_statement: input.versionData.problemStatement ?? undefined,
    _target_audience: input.versionData.targetAudience ?? undefined,
    _impact_score: input.versionData.impactScore ?? "MEDIUM",
    _effort_score: input.versionData.effortScore ?? "MEDIUM",
  });

  if (error) throw error;

  await logActivity(supabase, {
    workspaceId: input.workspaceId,
    actorId: user.id,
    ideaId: data.id,
    type: "idea_created",
    message: `${getDisplayName(user)}, '${input.versionData.title}' fikrini oluşturdu.`,
  });

  refresh();

  return data;
}

const updateIdeaSchema = z.object({
  ideaId: z.string().uuid(),
  versionData: versionDataSchema,
});

export async function updateIdea(ideaId: string, versionData: IdeaVersionData) {
  const input = updateIdeaSchema.parse({ ideaId, versionData });
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase.rpc("update_idea", {
    _idea_id: input.ideaId,
    _title: input.versionData.title,
    _content: input.versionData.content,
    _problem_statement: input.versionData.problemStatement ?? undefined,
    _target_audience: input.versionData.targetAudience ?? undefined,
    _impact_score: input.versionData.impactScore ?? "MEDIUM",
    _effort_score: input.versionData.effortScore ?? "MEDIUM",
  });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Yalnızca fikri oluşturan kişi veya workspace yöneticisi düzenleyebilir.");
    }
    throw error;
  }

  await logActivity(supabase, {
    workspaceId: data.workspace_id,
    actorId: user.id,
    ideaId: data.id,
    type: "idea_updated",
    message: `${getDisplayName(user)}, '${input.versionData.title}' fikrini güncelledi.`,
  });

  refresh();

  return data;
}

const moveIdeaSchema = z.object({
  ideaId: z.string().uuid(),
  targetColumnId: z.string().uuid(),
  cancellationReason: z.string().trim().min(1).optional(),
});

export async function moveIdea(
  ideaId: string,
  targetColumnId: string,
  cancellationReason?: string
) {
  const input = moveIdeaSchema.parse({ ideaId, targetColumnId, cancellationReason });
  const { supabase, user } = await requireUser();

  const { data: targetColumn, error: columnError } = await supabase
    .from("kanban_columns")
    .select("id, title, status_type")
    .eq("id", input.targetColumnId)
    .single();

  if (columnError) throw columnError;

  if (targetColumn.status_type === "CANCELLED" && !input.cancellationReason) {
    throw new Error("CANCELLED durumuna taşımak için iptal sebebi zorunludur.");
  }

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("id, workspace_id, created_by, idea_versions(title, version_number)")
    .eq("id", input.ideaId)
    .single();

  if (ideaError) throw ideaError;

  const latestVersion = idea.idea_versions
    .slice()
    .sort((a, b) => b.version_number - a.version_number)[0];
  const ideaTitle = latestVersion?.title ?? "";

  const { data: updatedIdea, error: updateError } = await supabase.rpc("move_idea", {
    _idea_id: input.ideaId,
    _target_column_id: input.targetColumnId,
    _cancellation_reason: targetColumn.status_type === "CANCELLED" ? input.cancellationReason : undefined,
  });

  if (updateError) {
    if (updateError.message.includes("permission_denied")) {
      throw new Error("Bu fikri taşıma yetkiniz yok.");
    }
    throw updateError;
  }

  // Bölüm 6.D: sadece fikri oluşturan kullanıcı (taşıyan actor hariç) bildirim alır.
  if (idea.created_by && idea.created_by !== user.id) {
    const actorName = getDisplayName(user);
    await notifyEvent({
      type: "idea_moved",
      recipientUserIds: [idea.created_by],
      actorId: user.id,
      workspaceId: idea.workspace_id,
      ideaId: input.ideaId,
      message: `${actorName}, '${ideaTitle}' kartını '${targetColumn.title}' durumuna taşıdı.`,
      email: {
        subject: `${actorName} bir fikrinizi taşıdı`,
        html: ideaMovedEmailHtml({
          actorName,
          ideaTitle,
          workspaceId: idea.workspace_id,
          ideaId: input.ideaId,
          targetColumnTitle: targetColumn.title,
        }),
      },
    });
  }

  await logActivity(supabase, {
    workspaceId: idea.workspace_id,
    actorId: user.id,
    ideaId: input.ideaId,
    type: "idea_moved",
    message: `${getDisplayName(user)}, '${ideaTitle}' kartını '${targetColumn.title}' durumuna taşıdı.`,
  });

  return updatedIdea;
}

const ideaIdSchema = z.string().uuid();

export async function getIdeaVersionHistory(ideaId: string) {
  const id = ideaIdSchema.parse(ideaId);
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("idea_versions")
    .select("*")
    .eq("idea_id", id)
    .order("version_number", { ascending: false });

  if (error) throw error;

  const profileById = await resolveAuthorProfiles(data.map((v) => v.created_by));

  return data.map((v) => ({
    ...v,
    authorEmail: profileById.get(v.created_by)?.email ?? null,
    authorFullName: profileById.get(v.created_by)?.fullName ?? null,
  }));
}

export async function softDeleteIdea(ideaId: string) {
  const id = ideaIdSchema.parse(ideaId);
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("soft_delete_idea", { _idea_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu fikri silme yetkiniz yok.");
    }
    throw error;
  }

  return { success: true as const };
}

export async function undoDeleteIdea(ideaId: string) {
  const id = ideaIdSchema.parse(ideaId);
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("undo_delete_idea", { _idea_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu fikri geri yükleme yetkiniz yok.");
    }
    throw error;
  }

  return { success: true as const };
}

const assignIdeaSchema = z.object({
  ideaId: z.string().uuid(),
  assigneeUserId: z.string().uuid().nullable(),
});

export async function assignIdea(ideaId: string, assigneeUserId: string | null) {
  const input = assignIdeaSchema.parse({ ideaId, assigneeUserId });
  const { supabase, user } = await requireUser();

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("id, workspace_id, idea_versions(title, version_number)")
    .eq("id", input.ideaId)
    .single();

  if (ideaError) throw ideaError;

  const { data: updatedIdea, error: updateError } = await supabase.rpc("assign_idea", {
    _idea_id: input.ideaId,
    _assignee_user_id: input.assigneeUserId ?? undefined,
  });

  if (updateError) {
    if (updateError.message.includes("permission_denied")) {
      throw new Error("Bu fikri atama yetkiniz yok.");
    }
    throw updateError;
  }

  const latestVersion = idea.idea_versions
    .slice()
    .sort((a, b) => b.version_number - a.version_number)[0];
  const ideaTitle = latestVersion?.title ?? "";

  if (input.assigneeUserId && input.assigneeUserId !== user.id) {
    const actorName = getDisplayName(user);
    await notifyEvent({
      type: "idea_assigned",
      recipientUserIds: [input.assigneeUserId],
      actorId: user.id,
      workspaceId: idea.workspace_id,
      ideaId: input.ideaId,
      message: `${actorName}, '${ideaTitle}' fikrini size atadı.`,
      email: {
        subject: `${actorName} size bir fikir atadı`,
        html: assignmentEmailHtml({ actorName, ideaTitle, workspaceId: idea.workspace_id, ideaId: input.ideaId }),
      },
    });
  }

  await logActivity(supabase, {
    workspaceId: idea.workspace_id,
    actorId: user.id,
    ideaId: input.ideaId,
    type: "idea_assigned",
    message: input.assigneeUserId
      ? `${getDisplayName(user)}, '${ideaTitle}' fikrini birine atadı.`
      : `${getDisplayName(user)}, '${ideaTitle}' fikrinin atamasını kaldırdı.`,
  });

  return updatedIdea;
}

const workspaceIdForIdeasSchema = z.string().uuid();

export async function getIdeasForWorkspace(workspaceId: string) {
  const id = workspaceIdForIdeasSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  return withAuthRetry(async () => {
    const { data, error } = await supabase
      .from("ideas")
      .select(
        "*, idea_versions(*), idea_tags(tag:tags(*)), idea_votes(user_id), comments(id, deleted_at)"
      )
      .eq("workspace_id", id)
      .is("deleted_at", null);
    if (error) throw error;
    return data;
  });
}

export async function toggleIdeaVote(ideaId: string) {
  const id = ideaIdSchema.parse(ideaId);
  const { supabase, user } = await requireUser();

  const { data: existingVote, error: existingError } = await supabase
    .from("idea_votes")
    .select("id")
    .eq("idea_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingVote) {
    const { error: deleteError } = await supabase
      .from("idea_votes")
      .delete()
      .eq("id", existingVote.id);
    if (deleteError) throw deleteError;
  } else {
    const { error: insertError } = await supabase
      .from("idea_votes")
      .insert({ idea_id: id, user_id: user.id });
    if (insertError) throw insertError;

    const { data: idea } = await supabase
      .from("ideas")
      .select("workspace_id, idea_versions(title, version_number)")
      .eq("id", id)
      .single();
    if (idea) {
      const latestVersion = idea.idea_versions
        .slice()
        .sort((a, b) => b.version_number - a.version_number)[0];
      await logActivity(supabase, {
        workspaceId: idea.workspace_id,
        actorId: user.id,
        ideaId: id,
        type: "idea_voted",
        message: `${getDisplayName(user)}, '${latestVersion?.title ?? ""}' fikrine oy verdi.`,
      });
    }
  }

  const { count, error: countError } = await supabase
    .from("idea_votes")
    .select("id", { count: "exact", head: true })
    .eq("idea_id", id);

  if (countError) throw countError;

  return { voted: !existingVote, voteCount: count ?? 0 };
}
