"use server";

import { z } from "zod";
import { requireUser, withAuthRetry } from "./_shared";

const workspaceIdSchema = z.string().uuid();

export async function getWorkspaceArchive(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  return withAuthRetry(async () => {
    const [ideasResult, projectsResult, activeProjectsResult] = await Promise.all([
      supabase
        .from("ideas")
        .select("id, project_id, archived_via_project_id, column_id, archived_at, archived_by, created_by, assignee_id, cancellation_reason, current_version, idea_versions(*), idea_tags(tag:tags(*)), column:kanban_columns(title, status_type)")
        .eq("workspace_id", id)
        .is("deleted_at", null)
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false }),
      supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", id)
        .is("deleted_at", null)
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name, color")
        .eq("workspace_id", id)
        .is("deleted_at", null)
        .order("name"),
    ]);
    if (ideasResult.error) throw ideasResult.error;
    if (projectsResult.error) throw projectsResult.error;
    if (activeProjectsResult.error) throw activeProjectsResult.error;

    return {
      ideas: (ideasResult.data ?? []).map((idea) => ({
        ...idea,
        currentVersion: idea.idea_versions.slice().sort((a, b) => b.version_number - a.version_number)[0] ?? null,
      })),
      projects: projectsResult.data ?? [],
      activeProjects: activeProjectsResult.data ?? [],
    };
  });
}
