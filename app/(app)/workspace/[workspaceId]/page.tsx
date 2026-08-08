import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { getWorkspaceForUser } from "@/app/actions/workspaceActions";
import { getIdeasForWorkspace } from "@/app/actions/ideaActions";
import { Button } from "@/components/ui/button";
import { Board } from "./_components/board";
import { SaveAsTemplateDialog } from "./_components/save-as-template-dialog";
import type { Database } from "@/lib/types/database.types";

type IdeaVersion = Database["public"]["Tables"]["idea_versions"]["Row"];

export default async function WorkspaceBoardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const [workspace, ideas] = await Promise.all([
    getWorkspaceForUser(workspaceId),
    getIdeasForWorkspace(workspaceId),
  ]);

  const versionsByColumn: Record<string, IdeaVersion[]> = {};
  for (const idea of ideas) {
    const currentVersion = idea.idea_versions.find(
      (v) => v.version_number === idea.current_version
    );
    if (!currentVersion) continue;
    (versionsByColumn[idea.column_id] ??= []).push(currentVersion);
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
        <SaveAsTemplateDialog workspaceId={workspaceId} />
      </div>
      <Board
        workspaceId={workspaceId}
        initialColumns={workspace.kanban_columns}
        versionsByColumn={versionsByColumn}
      />
    </div>
  );
}
