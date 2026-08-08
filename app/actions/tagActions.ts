"use server";

import { z } from "zod";
import { requireUser, logActivity } from "./_shared";

function actorDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName;
  return user.email ?? "Bir kullanıcı";
}

const workspaceIdSchema = z.string().uuid();

export async function getWorkspaceTags(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("workspace_id", id)
    .order("name", { ascending: true });

  if (error) throw error;

  return data;
}

const createTagSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().min(1).max(20),
});

export async function createTag(workspaceId: string, name: string, color: string) {
  const input = createTagSchema.parse({ workspaceId, name, color });
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("tags")
    .insert({ workspace_id: input.workspaceId, name: input.name, color: input.color })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Bu isimde bir etiket zaten var.");
    }
    throw error;
  }

  await logActivity(supabase, {
    workspaceId: input.workspaceId,
    actorId: user.id,
    type: "tag_created",
    message: `${actorDisplayName(user)}, '${input.name}' etiketini oluşturdu.`,
  });

  return data;
}

const tagIdSchema = z.string().uuid();

export async function deleteTag(tagId: string) {
  const id = tagIdSchema.parse(tagId);
  const { supabase, user } = await requireUser();

  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("workspace_id, name")
    .eq("id", id)
    .single();

  if (tagError) throw tagError;

  const { error } = await supabase.from("tags").delete().eq("id", id);

  if (error) throw error;

  await logActivity(supabase, {
    workspaceId: tag.workspace_id,
    actorId: user.id,
    type: "tag_deleted",
    message: `${actorDisplayName(user)}, '${tag.name}' etiketini sildi.`,
  });

  return { success: true as const };
}

const setIdeaTagsSchema = z.object({
  ideaId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()),
});

export async function setIdeaTags(ideaId: string, tagIds: string[]) {
  const input = setIdeaTagsSchema.parse({ ideaId, tagIds });
  const { supabase, user } = await requireUser();

  const { error: deleteError } = await supabase
    .from("idea_tags")
    .delete()
    .eq("idea_id", input.ideaId);

  if (deleteError) throw deleteError;

  if (input.tagIds.length > 0) {
    const { error: insertError } = await supabase
      .from("idea_tags")
      .insert(input.tagIds.map((tagId) => ({ idea_id: input.ideaId, tag_id: tagId })));

    if (insertError) throw insertError;
  }

  const { data: idea } = await supabase
    .from("ideas")
    .select("workspace_id, idea_versions(title, version_number)")
    .eq("id", input.ideaId)
    .single();

  if (idea) {
    const latestVersion = idea.idea_versions
      .slice()
      .sort((a, b) => b.version_number - a.version_number)[0];
    await logActivity(supabase, {
      workspaceId: idea.workspace_id,
      actorId: user.id,
      ideaId: input.ideaId,
      type: "idea_tags_updated",
      message: `${actorDisplayName(user)}, '${latestVersion?.title ?? ""}' fikrinin etiketlerini güncelledi.`,
    });
  }

  return { success: true as const };
}
