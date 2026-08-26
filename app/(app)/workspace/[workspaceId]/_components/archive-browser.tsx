"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, ChevronDownIcon, ClockIcon, FolderKanbanIcon, LightbulbIcon, RotateCcwIcon, SearchIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { restoreArchivedIdea } from "@/app/actions/ideaActions";
import { restoreArchivedProject } from "@/app/actions/projectActions";
import type { getWorkspaceArchive } from "@/app/actions/archiveActions";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import { projectColorHex } from "@/lib/project-colors";
import { tagColorClasses, IMPACT_EFFORT_LABELS } from "@/lib/status";

type ArchiveData = Awaited<ReturnType<typeof getWorkspaceArchive>>;
type ArchivedIdea = ArchiveData["ideas"][number];
type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type Kind = "ideas" | "projects";

export function ArchiveBrowser({ initialData, members }: { workspaceId: string; initialData: ArchiveData; members: Member[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("ideas");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedIdea, setSelectedIdea] = useState<ArchivedIdea | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const independentIdeas = useMemo(() => initialData.ideas.filter((idea) => idea.archived_via_project_id === null), [initialData.ideas]);
  const projectIdeas = useMemo(() => {
    const grouped: Record<string, ArchivedIdea[]> = {};
    for (const idea of initialData.ideas) if (idea.archived_via_project_id) (grouped[idea.archived_via_project_id] ??= []).push(idea);
    return grouped;
  }, [initialData.ideas]);

  const ideas = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("tr-TR");
    return independentIdeas.filter((idea) => {
      const text = `${idea.currentVersion?.title ?? ""} ${idea.currentVersion?.content ?? ""}`.toLocaleLowerCase("tr-TR");
      return (!term || text.includes(term)) && (projectFilter === "all" || idea.project_id === projectFilter);
    });
  }, [independentIdeas, projectFilter, query]);

  const projects = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("tr-TR");
    return initialData.projects.filter((project) => {
      const childText = (projectIdeas[project.id] ?? []).map((idea) => idea.currentVersion?.title ?? "").join(" ");
      return !term || `${project.name} ${project.description ?? ""} ${childText}`.toLocaleLowerCase("tr-TR").includes(term);
    });
  }, [initialData.projects, projectIdeas, query]);

  function restore(kindToRestore: Kind, id: string) {
    setRestoringId(id);
    startTransition(async () => {
      try {
        if (kindToRestore === "ideas") await restoreArchivedIdea(id);
        else await restoreArchivedProject(id);
        setSelectedIdea(null);
        toast.success(kindToRestore === "ideas" ? "Fikir geri yüklendi" : "Proje ve fikirleri geri yüklendi");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Geri yükleme başarısız");
      } finally { setRestoringId(null); }
    });
  }

  const visibleItems = kind === "ideas" ? ideas : projects;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
        <div className="flex rounded-lg bg-muted p-1">
          <Button size="sm" variant={kind === "ideas" ? "default" : "ghost"} onClick={() => setKind("ideas")}><LightbulbIcon /> Fikirler ({independentIdeas.length})</Button>
          <Button size="sm" variant={kind === "projects" ? "default" : "ghost"} onClick={() => setKind("projects")}><FolderKanbanIcon /> Projeler ({initialData.projects.length})</Button>
        </div>
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Arşivde ara..." className="pl-9" />
        </div>
        {kind === "ideas" && (
          <Select value={projectFilter} onValueChange={(value) => setProjectFilter(value ?? "all")}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue>{projectFilter === "all" ? "Tüm Projeler" : initialData.activeProjects.find((project) => project.id === projectFilter)?.name}</SelectValue></SelectTrigger>
            <SelectContent><SelectItem value="all">Tüm Projeler</SelectItem>{initialData.activeProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed text-center"><ArchiveIcon className="mb-3 size-7 text-muted-foreground" /><p className="font-medium">Eşleşen arşiv kaydı yok</p><p className="mt-1 text-sm text-muted-foreground">Arama veya filtre seçimini değiştirebilirsiniz.</p></div>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kind === "ideas" ? ideas.map((idea) => <ArchivedIdeaCard key={idea.id} idea={idea} members={members} projects={initialData.activeProjects} onOpen={() => setSelectedIdea(idea)} />) : projects.map((project) => {
            const color = projectColorHex(project.color);
            const childIdeas = projectIdeas[project.id] ?? [];
            return (
              <Card key={project.id} className="overflow-hidden bg-card/85" style={{ borderLeft: `4px solid ${color}` }}>
                <CardHeader><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="line-clamp-2 text-base">{project.name}</CardTitle><ArchiveMeta archivedAt={project.archived_at} archivedBy={project.archived_by} members={members} /></div><Button size="sm" variant="outline" disabled={restoringId === project.id} onClick={() => restore("projects", project.id)}><RotateCcwIcon /> Geri Yükle</Button></div></CardHeader>
                <CardContent className="space-y-3">
                  <TiptapContentView content={project.description} clamp compact />
                  {childIdeas.length > 0 && <details className="group overflow-hidden rounded-xl border bg-muted/25"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium"><span className="flex items-center gap-2"><LightbulbIcon className="size-4" /> Arşivlenen fikirler <Badge variant="secondary">{childIdeas.length}</Badge></span><ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" /></summary><div className="space-y-1 border-t p-2">{childIdeas.map((idea) => <button key={idea.id} type="button" onClick={() => setSelectedIdea(idea)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-background"><span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} /><span className="min-w-0 flex-1 truncate">{idea.currentVersion?.title ?? "Başlıksız fikir"}</span><span className="text-xs text-muted-foreground">Detay</span></button>)}</div></details>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ArchivedIdeaDialog idea={selectedIdea} members={members} projects={initialData.activeProjects} onOpenChange={(open) => !open && setSelectedIdea(null)} onRestore={(id) => restore("ideas", id)} restoring={restoringId === selectedIdea?.id} />
    </div>
  );
}

function ArchivedIdeaCard({ idea, members, projects, onOpen }: { idea: ArchivedIdea; members: Member[]; projects: ArchiveData["activeProjects"]; onOpen: () => void }) {
  const project = projects.find((item) => item.id === idea.project_id);
  const color = projectColorHex(project?.color);
  return <Card role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onOpen()} className="cursor-pointer overflow-hidden bg-card/85 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg" style={project ? { borderLeft: `4px solid ${color}` } : undefined}><CardHeader><CardTitle className="line-clamp-2 text-base">{idea.currentVersion?.title ?? "Başlıksız fikir"}</CardTitle></CardHeader><CardContent className="space-y-3">{idea.currentVersion?.content && <div className="rounded-lg border bg-background/40 px-3 py-2"><TiptapContentView content={idea.currentVersion.content} clamp compact /></div>}<div className="flex flex-wrap gap-1">{project && <ProjectBadge name={project.name} color={color} />}{idea.idea_tags.map(({ tag }) => tag && <Badge key={tag.id} variant="secondary" className={`h-5 gap-1.5 rounded-md border-0 px-2 text-[0.66rem] ${tagColorClasses(tag.color).softClass}`}><span className={`size-1.5 rounded-full ${tagColorClasses(tag.color).dotClass}`} />{tag.name}</Badge>)}</div><ArchiveMeta archivedAt={idea.archived_at} archivedBy={idea.archived_by} members={members} /></CardContent></Card>;
}

function ArchivedIdeaDialog({ idea, members, projects, onOpenChange, onRestore, restoring }: { idea: ArchivedIdea | null; members: Member[]; projects: ArchiveData["activeProjects"]; onOpenChange: (open: boolean) => void; onRestore: (id: string) => void; restoring: boolean }) {
  if (!idea) return null;
  const version = idea.currentVersion;
  const project = projects.find((item) => item.id === idea.project_id);
  return <Dialog open onOpenChange={onOpenChange}><DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] min-w-0 overflow-x-hidden overflow-y-auto sm:max-w-2xl"><DialogHeader className="min-w-0"><DialogTitle className="min-w-0 pr-10 text-xl leading-snug [overflow-wrap:anywhere]">{version?.title ?? "Başlıksız fikir"}</DialogTitle><DialogDescription>Arşivlenmiş fikir ayrıntıları</DialogDescription></DialogHeader><div className="min-w-0 space-y-5 overflow-hidden"><div className="flex min-w-0 flex-wrap gap-2">{project && <ProjectBadge name={project.name} color={projectColorHex(project.color)} />}<Badge variant="outline" className="max-w-full truncate">{idea.column?.title ?? "Bilinmeyen kolon"}</Badge>{idea.idea_tags.map(({ tag }) => tag && <Badge key={tag.id} variant="secondary" className={`max-w-full truncate ${tagColorClasses(tag.color).softClass}`}>{tag.name}</Badge>)}</div><ArchiveMeta archivedAt={idea.archived_at} archivedBy={idea.archived_by} members={members} />{version?.content && <div className="min-w-0 overflow-hidden rounded-xl border bg-muted/25 p-4"><TiptapContentView content={version.content} /></div>}<div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2"><Detail label="Problem Tanımı" value={version?.problem_statement} /><Detail label="Hedef Kitle" value={version?.target_audience} /><Detail label="Etki" value={IMPACT_EFFORT_LABELS[version?.impact_score ?? "MEDIUM"]} /><Detail label="Efor" value={IMPACT_EFFORT_LABELS[version?.effort_score ?? "MEDIUM"]} /></div>{idea.archived_via_project_id === null && <div className="flex justify-end"><Button disabled={restoring} onClick={() => onRestore(idea.id)}><RotateCcwIcon /> Geri Yükle</Button></div>}</div></DialogContent></Dialog>;
}

function ProjectBadge({ name, color }: { name: string; color: string }) { return <Badge className="h-5 max-w-full gap-1.5 rounded-md border px-2 text-[0.66rem]" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, borderColor: `color-mix(in srgb, ${color} 28%, transparent)`, color }}><span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} /><FolderKanbanIcon className="size-3 shrink-0" /><span className="truncate">{name}</span></Badge>; }

function ArchiveMeta({ archivedAt, archivedBy, members }: { archivedAt: string | null; archivedBy: string | null; members: Member[] }) { const member = members.find((item) => item.user_id === archivedBy); return <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><UserIcon className="size-3" />{member?.fullName ?? "Bilinmeyen kullanıcı"}</span><span className="flex items-center gap-1"><ClockIcon className="size-3" />{archivedAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(archivedAt)) : "Tarih bilinmiyor"}</span></div>; }

function Detail({ label, value }: { label: string; value: string | null | undefined }) { return <div className="min-w-0 overflow-hidden rounded-xl border bg-muted/20 p-3"><p className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p><p className="mt-1 min-w-0 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{value || "Belirtilmemiş"}</p></div>; }
