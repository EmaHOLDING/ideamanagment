import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { getWorkspaceForUser, getWorkspaceMembers } from "@/app/actions/workspaceActions";
import { getIdeasForWorkspace } from "@/app/actions/ideaActions";
import { getWorkspaceTags } from "@/app/actions/tagActions";
import { Button } from "@/components/ui/button";
import { Board } from "./_components/board";
import { SaveAsTemplateDialog } from "./_components/save-as-template-dialog";
import { MembersDialog } from "./_components/members-dialog";
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
  ] = await Promise.all([
    supabase.auth.getUser(),
    getWorkspaceForUser(workspaceId),
    getIdeasForWorkspace(workspaceId),
    getWorkspaceMembers(workspaceId),
    getWorkspaceTags(workspaceId),
  ]);

  const versionsByColumn: Record<string, IdeaVersion[]> = {};
  const assigneeByIdea: Record<string, string | null> = {};
  const tagsByIdea: Record<string, Database["public"]["Tables"]["tags"]["Row"][]> = {};
  const voteCountByIdea: Record<string, number> = {};
  const hasVotedByIdea: Record<string, boolean> = {};
  for (const idea of ideas) {
    const currentVersion = idea.idea_versions.find(
      (v) => v.version_number === idea.current_version
    );
    if (!currentVersion) continue;
    (versionsByColumn[idea.column_id] ??= []).push(currentVersion);
    assigneeByIdea[idea.id] = idea.assignee_id;
    tagsByIdea[idea.id] = idea.idea_tags.map((it) => it.tag).filter((t) => t !== null);
    voteCountByIdea[idea.id] = idea.idea_votes.length;
    hasVotedByIdea[idea.id] = idea.idea_votes.some((v) => v.user_id === user!.id);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={
              <Link href="/workspaces" aria-label="Workspace'lerime dön">
                <ArrowLeftIcon />
              </Link>
            }
          />
          <h1 className="text-lg font-semibold">{workspace.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ActivityPanel workspaceId={workspaceId} />
          <MembersDialog
            workspaceId={workspaceId}
            isOwner={workspace.isOwner}
            currentUserId={user!.id}
            inviteCode={workspace.invite_code}
          />
          {workspace.isOwner && <SaveAsTemplateDialog workspaceId={workspaceId} />}
        </div>
      </div>
      <Board
        workspaceId={workspaceId}
        initialColumns={workspace.kanban_columns}
        versionsByColumn={versionsByColumn}
        assigneeByIdea={assigneeByIdea}
        tagsByIdea={tagsByIdea}
        voteCountByIdea={voteCountByIdea}
        hasVotedByIdea={hasVotedByIdea}
        members={members}
        tags={tags}
        isOwner={workspace.isOwner}
        autoOpenIdeaId={autoOpenIdeaId ?? null}
      />
    </div>
  );
}
