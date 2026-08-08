import { FolderKanbanIcon } from "lucide-react";
import { getMyWorkspaces } from "@/app/actions/workspaceActions";
import { getTemplates } from "@/app/actions/templateActions";
import { CreateWorkspaceDialog } from "./_components/create-workspace-dialog";
import { WorkspaceCard } from "./_components/workspace-card";

export default async function WorkspacesPage() {
  const [workspaces, templates] = await Promise.all([getMyWorkspaces(), getTemplates()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Workspace&apos;lerim</h1>
        <CreateWorkspaceDialog templates={templates} />
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <FolderKanbanIcon className="size-6 text-primary" />
          </div>
          <h2 className="text-base font-medium">Henüz bir workspace&apos;iniz yok</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Yeni bir tane oluşturun veya bir davet linkiyle katılın.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {workspaces.map((ws) => (
            <WorkspaceCard key={ws.id} id={ws.id} title={ws.title} inviteCode={ws.invite_code} />
          ))}
        </div>
      )}
    </div>
  );
}
