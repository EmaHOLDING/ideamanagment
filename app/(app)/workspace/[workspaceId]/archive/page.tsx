import Link from "next/link";
import { ArrowLeftIcon, ArchiveIcon } from "lucide-react";
import { getWorkspaceForUser, getWorkspaceMembers } from "@/app/actions/workspaceActions";
import { getWorkspaceArchive } from "@/app/actions/archiveActions";
import { Button } from "@/components/ui/button";
import { ArchiveBrowser } from "../_components/archive-browser";

export default async function WorkspaceArchivePage({ params }: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const [workspace, archive, members] = await Promise.all([
    getWorkspaceForUser(workspaceId),
    getWorkspaceArchive(workspaceId),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-muted/20">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-start gap-3">
          <Button variant="ghost" size="icon" nativeButton={false} render={
            <Link href={`/workspace/${workspaceId}`} aria-label="Panoya dön"><ArrowLeftIcon /></Link>
          } />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-primary uppercase">
              <ArchiveIcon className="size-4" /> Arşiv
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{workspace.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Arşivlenen fikirleri ve projeleri tek yerden yönetin.</p>
          </div>
        </header>
        <ArchiveBrowser workspaceId={workspaceId} initialData={archive} members={members} />
      </div>
    </div>
  );
}
