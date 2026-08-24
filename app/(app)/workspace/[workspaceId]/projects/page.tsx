import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  FolderKanbanIcon,
  InboxIcon,
  LightbulbIcon,
} from "lucide-react";
import { getWorkspaceForUser } from "@/app/actions/workspaceActions";
import { getWorkspaceProjectsWithCounts } from "@/app/actions/projectActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import { ProjectCreateButton } from "../_components/project-create-button";

export default async function WorkspaceProjectsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const [workspace, projects] = await Promise.all([
    getWorkspaceForUser(workspaceId),
    getWorkspaceProjectsWithCounts(workspaceId),
  ]);

  const canContribute = workspace.role !== "VIEWER";

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_32rem)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              className="mt-0.5"
              render={
                <Link href={`/workspace/${workspaceId}`} aria-label="Panoya dön">
                  <ArrowLeftIcon />
                </Link>
              }
            />
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                <FolderKanbanIcon className="size-3.5" />
                Projeler
              </div>
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {workspace.title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Bir fikri panodan &quot;Projeye Dönüştür&quot; ile terfi ettirebilir veya buradan
                sıfırdan bir proje tanımlayabilirsiniz.
              </p>
            </div>
          </div>
          {canContribute && <ProjectCreateButton workspaceId={workspaceId} />}
        </header>

        {projects.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-6 text-center">
            <InboxIcon className="mb-3 size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Henüz proje yok</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Olgunlaşan bir fikri panoda açıp &quot;Projeye Dönüştür&quot; diyebilir, ya da
              yukarıdan sıfırdan bir proje oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/workspace/${workspaceId}/project/${project.id}`}
                className="group focus-visible:outline-none"
              >
                <Card className="h-full border-0 bg-card/80 backdrop-blur-sm transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-black/10 group-focus-visible:ring-2 group-focus-visible:ring-ring">
                  <CardHeader className="flex-row items-start justify-between gap-2">
                    <CardTitle className="min-w-0 [overflow-wrap:anywhere] line-clamp-2 text-base">
                      {project.name}
                    </CardTitle>
                    <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {project.description ? (
                      <TiptapContentView
                        content={project.description}
                        clamp
                        className="text-sm text-muted-foreground"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground/70 italic">
                        Açıklama eklenmemiş.
                      </p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="gap-1 tabular-nums">
                        <LightbulbIcon className="size-3" />
                        {project.ideaCount} fikir
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
