"use server";

import { z } from "zod";
import { requireUser, resolveAuthorEmails } from "./_shared";
import { createAdminClient } from "@/lib/supabase/admin";

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

function actorDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName;
  return user.email ?? "Bir kullanıcı";
}

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
  const { supabase } = await requireUser();

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

  return data;
}

const updateIdeaSchema = z.object({
  ideaId: z.string().uuid(),
  versionData: versionDataSchema,
});

export async function updateIdea(ideaId: string, versionData: IdeaVersionData) {
  const input = updateIdeaSchema.parse({ ideaId, versionData });
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("update_idea", {
    _idea_id: input.ideaId,
    _title: input.versionData.title,
    _content: input.versionData.content,
    _problem_statement: input.versionData.problemStatement ?? undefined,
    _target_audience: input.versionData.targetAudience ?? undefined,
    _impact_score: input.versionData.impactScore ?? "MEDIUM",
    _effort_score: input.versionData.effortScore ?? "MEDIUM",
  });

  if (error) throw error;

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
    .select("id, created_by, idea_versions(title, version_number)")
    .eq("id", input.ideaId)
    .single();

  if (ideaError) throw ideaError;

  const latestVersion = idea.idea_versions
    .slice()
    .sort((a, b) => b.version_number - a.version_number)[0];
  const ideaTitle = latestVersion?.title ?? "";

  const { data: updatedIdea, error: updateError } = await supabase
    .from("ideas")
    .update({
      column_id: input.targetColumnId,
      cancellation_reason: targetColumn.status_type === "CANCELLED" ? input.cancellationReason : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.ideaId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Bölüm 6.D: sadece fikri oluşturan kullanıcı (taşıyan actor hariç) bildirim alır.
  if (idea.created_by && idea.created_by !== user.id) {
    const admin = createAdminClient();
    const { error: notificationError } = await admin.from("notifications").insert({
      user_id: idea.created_by,
      actor_id: user.id,
      idea_id: input.ideaId,
      message: `${actorDisplayName(user)}, '${ideaTitle}' kartını '${targetColumn.title}' durumuna taşıdı.`,
    });
    if (notificationError) throw notificationError;
  }

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

  const authorEmailById = await resolveAuthorEmails(data.map((v) => v.created_by));

  return data.map((v) => ({
    ...v,
    authorEmail: authorEmailById.get(v.created_by) ?? null,
  }));
}

export async function deleteIdea(ideaId: string) {
  const id = ideaIdSchema.parse(ideaId);
  const { supabase } = await requireUser();

  const { error } = await supabase.from("ideas").delete().eq("id", id);

  if (error) throw error;

  return { success: true as const };
}

const workspaceIdForIdeasSchema = z.string().uuid();

export async function getIdeasForWorkspace(workspaceId: string) {
  const id = workspaceIdForIdeasSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("ideas")
    .select("*, idea_versions(*)")
    .eq("workspace_id", id);

  if (error) throw error;

  return data;
}
