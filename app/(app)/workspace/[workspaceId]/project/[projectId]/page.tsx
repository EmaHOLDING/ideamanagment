import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  FolderKanbanIcon,
  InboxIcon,
  LightbulbIcon,
  SproutIcon,
  TargetIcon,
} from "lucide-react";
import { getProjectContext } from "@/app/actions/projectActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import { ProjectEditButton } from "../../_components/project-edit-button";
import { getWorkspaceForUser } from "@/app/actions/workspaceActions";
import { ProjectArchiveButton } from "../../_components/project-archive-button";
import { projectColorHex } from "@/lib/project-colors";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const { workspaceId, projectId } = await params;
  const [{ project, ideas }, workspace] = await Promise.all([
    getProjectContext(projectId),
    getWorkspaceForUser(workspaceId),
  ]);
  const canManageContent = workspace.isOwner || workspace.role === "ADMIN";

  // Erişim zaten RLS ile korunuyor; bu yalnızca yanlış workspace URL'ine karşı.
  if (project.workspace_id !== workspaceId) notFound();

  const ideaSummaries = ideas
    .flatMap((idea) => {
      const version = idea.idea_versions.find((v) => v.version_number === idea.current_version);
      if (!version) return [];
      return [
        {
          id: idea.id,
          title: version.title,
          isOrigin: project.origin_idea_id === idea.id,
          updatedAt: idea.updated_at,
        },
      ];
    })
    .sort((a, b) => Number(b.isOrigin) - Number(a.isOrigin));

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
                <Link href={`/workspace/${workspaceId}/projects`} aria-label="Projeler'e dön">
                  <ArrowLeftIcon />
                </Link>
              }
            />
            <div className="min-w-0">
              <Link
                href={`/workspace/${workspaceId}/projects`}
                className="mb-1 flex w-fit items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase transition-colors hover:text-primary/80"
              >
                <FolderKanbanIcon className="size-3.5" />
                Projeler
              </Link>
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                <span className="mr-2 inline-block size-3 rounded-full align-middle" style={{ backgroundColor: projectColorHex(project.color) }} />
                {project.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Bu projeye bağlı fikirler, aşağıdaki problem ve hedef kitle tanımını varsayılan
                olarak miras alır.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ProjectEditButton project={project} />
            {canManageContent && <ProjectArchiveButton workspaceId={workspaceId} projectId={project.id} projectName={project.name} ideaCount={ideaSummaries.length} />}
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/workspace/${workspaceId}`}>
                  Panoya git <ArrowUpRightIcon />
                </Link>
              }
            />
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)]">
          <div className="flex flex-col gap-4">
            <Card className="border-0 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Açıklama</CardTitle>
                <CardDescription>Projenin vizyonu ve kapsamı.</CardDescription>
              </CardHeader>
              <CardContent>
                {project.description ? (
                  <TiptapContentView content={project.description} />
                ) : (
                  <EmptyState text="Henüz bir açıklama eklenmemiş." />
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-0 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base">Ana Problem Tanımı</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.problem_statement ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
                      {project.problem_statement}
                    </p>
                  ) : (
                    <EmptyState text="Tanımlanmamış." />
                  )}
                </CardContent>
              </Card>
              <Card className="border-0 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    <TargetIcon className="size-4" /> Ana Hedef Kitle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.target_audience ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
                      {project.target_audience}
                    </p>
                  ) : (
                    <EmptyState text="Tanımlanmamış." />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Bağlı fikirler</CardTitle>
                <CardDescription>Bu projenin altında geliştirilen fikirler.</CardDescription>
              </div>
              <Badge variant="outline" className="shrink-0 tabular-nums">
                {ideaSummaries.length}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {ideaSummaries.length === 0 ? (
                <EmptyState text="Bu projeye henüz fikir bağlanmamış. Fikir oluştururken Proje alanından bu projeyi seçebilirsiniz." />
              ) : (
                ideaSummaries.map((idea) => (
                  <Link
                    key={idea.id}
                    href={`/workspace/${workspaceId}?idea=${idea.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span
                      className={
                        idea.isOrigin
                          ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                          : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                      }
                    >
                      {idea.isOrigin ? (
                        <SproutIcon className="size-4" />
                      ) : (
                        <LightbulbIcon className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{idea.title}</span>
                      {idea.isOrigin && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Bu projenin çıkış fikri
                        </span>
                      )}
                    </span>
                    <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-5 text-center">
      <InboxIcon className="mb-2 size-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
