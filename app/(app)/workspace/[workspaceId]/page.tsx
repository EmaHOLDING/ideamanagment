import Link from "next/link";
import { ArrowLeftIcon, ChartNoAxesCombinedIcon, FolderKanbanIcon, SettingsIcon } from "lucide-react";
import { getWorkspaceForUser, getWorkspaceMembers } from "@/app/actions/workspaceActions";
import { getIdeasForWorkspace } from "@/app/actions/ideaActions";
import { getWorkspaceTags } from "@/app/actions/tagActions";
import { getWorkspaceProjects } from "@/app/actions/projectActions";
import { Button } from "@/components/ui/button";
import { Board } from "./_components/board";
import { ActivityPanel } from "./_components/activity-panel";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type IdeaVersion = Database["public"]["Tables"]["idea_versions"]["Row"];

export default async function WorkspaceBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ idea?: string }>;
}) {
  const { workspaceId } = await params;
  const { idea: autoOpenIdeaId } = await searchParams;

  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    workspace,
    ideas,
    members,
    tags,
    projects,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getWorkspaceForUser(workspaceId),
    getIdeasForWorkspace(workspaceId),
    getWorkspaceMembers(workspaceId),
    getWorkspaceTags(workspaceId),
    getWorkspaceProjects(workspaceId),
  ]);

  const isAdmin = workspace.role === "ADMIN";
  const isViewer = workspace.role === "VIEWER";
  const canManageContent = workspace.isOwner || isAdmin;
  const canContribute = !isViewer;

  const versionsByColumn: Record<string, IdeaVersion[]> = {};
  const assigneeByIdea: Record<string, string | null> = {};
  const tagsByIdea: Record<string, Database["public"]["Tables"]["tags"]["Row"][]> = {};
  const projectByIdea: Record<string, string | null> = {};
  const voteCountByIdea: Record<string, number> = {};
  const hasVotedByIdea: Record<string, boolean> = {};
  const createdByIdea: Record<string, string> = {};
  const commentCountByIdea: Record<string, number> = {};
  for (const idea of ideas) {
    const currentVersion = idea.idea_versions.find(
      (v) => v.version_number === idea.current_version
    );
    if (!currentVersion) continue;
    (versionsByColumn[idea.column_id] ??= []).push(currentVersion);
    assigneeByIdea[idea.id] = idea.assignee_id;
    tagsByIdea[idea.id] = idea.idea_tags.map((it) => it.tag).filter((t) => t !== null);
    projectByIdea[idea.id] = idea.project_id;
    voteCountByIdea[idea.id] = idea.idea_votes.length;
    hasVotedByIdea[idea.id] = idea.idea_votes.some((v) => v.user_id === user!.id);
    createdByIdea[idea.id] = idea.created_by;
    commentCountByIdea[idea.id] = idea.comments.filter((c) => !c.deleted_at).length;
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            className="shrink-0"
            render={
              <Link href="/workspaces" aria-label="Workspace'lerime dön">
                <ArrowLeftIcon />
              </Link>
            }
          />
          <div className="min-w-0">
            <p className="hidden text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase sm:block">Fikir panosu</p>
            <h1 className="truncate text-base font-semibold sm:text-lg">{workspace.title}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/workspace/${workspaceId}/overview`}>
                <ChartNoAxesCombinedIcon /> <span className="hidden sm:inline">Genel Bakış</span>
              </Link>
            }
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/workspace/${workspaceId}/projects`} aria-label="Projeler">
                <FolderKanbanIcon /> <span className="hidden sm:inline">Projeler</span>
              </Link>
            }
          />
          <ActivityPanel workspaceId={workspaceId} />
          {canManageContent && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/workspace/${workspaceId}/settings`} aria-label="Ayarlar">
                  <SettingsIcon /> <span className="hidden sm:inline">Ayarlar</span>
                </Link>
              }
            />
          )}
        </div>
      </div>
      <Board
        workspaceId={workspaceId}
        initialColumns={workspace.kanban_columns}
        versionsByColumn={versionsByColumn}
        assigneeByIdea={assigneeByIdea}
        tagsByIdea={tagsByIdea}
        projectByIdea={projectByIdea}
        projects={projects}
        voteCountByIdea={voteCountByIdea}
        hasVotedByIdea={hasVotedByIdea}
        createdByIdea={createdByIdea}
        commentCountByIdea={commentCountByIdea}
        currentUserId={user!.id}
        members={members}
        tags={tags}
        canManageContent={canManageContent}
        isViewer={isViewer}
        canContribute={canContribute}
        autoOpenIdeaId={autoOpenIdeaId ?? null}
      />
    </div>
  );
}
