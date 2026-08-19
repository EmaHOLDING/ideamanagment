import { FolderKanbanIcon, LayoutGridIcon } from "lucide-react";
import { getMyWorkspaces, getWorkspaceMemberCount } from "@/app/actions/workspaceActions";
import { getTemplates } from "@/app/actions/templateActions";
import { CreateWorkspaceDialog } from "./_components/create-workspace-dialog";
import { WorkspaceCard } from "./_components/workspace-card";
import { PendingWorkspaceCard } from "./_components/pending-workspace-card";

export default async function WorkspacesPage() {
  const [workspaces, templates] = await Promise.all([getMyWorkspaces(), getTemplates()]);

  const pending = workspaces.filter((ws) => ws.status === "PENDING");
  const active = workspaces.filter((ws) => ws.status === "ACTIVE");

  const pendingWithCounts = await Promise.all(
    pending.map(async (ws) => ({ ...ws, memberCount: await getWorkspaceMemberCount(ws.id) }))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="mb-7 flex flex-col items-start justify-between gap-4 sm:mb-8 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wider text-primary uppercase">Çalışma alanları</p>
          <h1 className="text-2xl font-semibold tracking-tight">Workspace&apos;lerim</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fikirlerinizi topladığınız ve ekibinizle geliştirdiğiniz alanlar.</p>
        </div>
        <CreateWorkspaceDialog templates={templates} />
      </div>

      {pendingWithCounts.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Bekleyen Davetler
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingWithCounts.map((ws) => (
              <PendingWorkspaceCard
                key={ws.id}
                id={ws.id}
                title={ws.title}
                role={ws.role}
                memberCount={ws.memberCount}
              />
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && pendingWithCounts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-5 py-16 text-center sm:py-20">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
            <FolderKanbanIcon className="size-6 text-primary" />
          </div>
          <h2 className="text-base font-medium">Henüz bir workspace&apos;iniz yok</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Yeni bir tane oluşturun veya bir davet linkiyle katılın.
          </p>
        </div>
      ) : (
        active.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><LayoutGridIcon className="size-4 text-muted-foreground" /> Aktif alanlar</h2>
              <span className="text-xs tabular-nums text-muted-foreground">{active.length} çalışma alanı</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                id={ws.id}
                title={ws.title}
                description={ws.description}
                role={ws.role}
              />
            ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}
