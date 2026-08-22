import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ChartNoAxesCombinedIcon,
  CircleAlertIcon,
  Clock3Icon,
  InboxIcon,
  SparklesIcon,
  UserRoundXIcon,
} from "lucide-react";
import { getActivityLog } from "@/app/actions/activityActions";
import { getIdeasForWorkspace } from "@/app/actions/ideaActions";
import { getWorkspaceForUser } from "@/app/actions/workspaceActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STALE_DAYS = 7;
const ACTIVE_STATUS = new Set(["DRAFT", "IN_REVIEW", "APPROVED"]);
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-400",
  IN_REVIEW: "bg-amber-400",
  APPROVED: "bg-indigo-400",
  CANCELLED: "bg-rose-400",
  DONE: "bg-emerald-400",
};

async function getRequestTimestamp() {
  return Date.now();
}

function relativeDate(value: string, requestTimestamp: number) {
  const days = Math.max(0, Math.floor((requestTimestamp - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Bugün";
  if (days === 1) return "Dün";
  return `${days} gün önce`;
}

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const [workspace, ideas, activity, requestTimestamp] = await Promise.all([
    getWorkspaceForUser(workspaceId),
    getIdeasForWorkspace(workspaceId),
    getActivityLog(workspaceId),
    getRequestTimestamp(),
  ]);

  const columnById = new Map(workspace.kanban_columns.map((column) => [column.id, column]));
  const ideaSummaries = ideas.flatMap((idea) => {
    const version = idea.idea_versions.find((item) => item.version_number === idea.current_version);
    const column = columnById.get(idea.column_id);
    if (!version || !column) return [];
    return [{
      id: idea.id,
      title: version.title,
      updatedAt: idea.updated_at,
      assigneeId: idea.assignee_id,
      voteCount: idea.idea_votes.length,
      columnTitle: column.title,
      status: column.status_type,
      isActive: ACTIVE_STATUS.has(column.status_type),
      isStale: ACTIVE_STATUS.has(column.status_type) && requestTimestamp - new Date(idea.updated_at).getTime() >= STALE_DAYS * 86_400_000,
    }];
  });

  const activeIdeas = ideaSummaries.filter((idea) => idea.isActive);
  const inReview = activeIdeas.filter((idea) => idea.status === "IN_REVIEW");
  const unassigned = activeIdeas.filter((idea) => !idea.assigneeId);
  const stale = activeIdeas.filter((idea) => idea.isStale);
  const topVoted = [...ideaSummaries]
    .filter((idea) => idea.voteCount > 0)
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 5);
  const attention = [...activeIdeas]
    .map((idea) => ({
      ...idea,
      score: Number(idea.isStale) * 2 + Number(!idea.assigneeId) + Number(idea.status === "IN_REVIEW"),
    }))
    .filter((idea) => idea.score > 0)
    .sort((a, b) => b.score - a.score || new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
    .slice(0, 6);
  const maxColumnCount = Math.max(
    1,
    ...workspace.kanban_columns.map((column) => ideaSummaries.filter((idea) => idea.columnTitle === column.title).length)
  );

  const metrics = [
    { label: "Aktif fikir", value: activeIdeas.length, note: "Devam eden toplam çalışma", icon: SparklesIcon, tone: "text-indigo-300 bg-indigo-500/10" },
    { label: "İncelemede", value: inReview.length, note: "Karar bekleyen fikir", icon: Clock3Icon, tone: "text-amber-300 bg-amber-500/10" },
    { label: "Atanmamış", value: unassigned.length, note: "Sorumlusu olmayan aktif fikir", icon: UserRoundXIcon, tone: "text-sky-300 bg-sky-500/10" },
    { label: "Uzun süredir bekleyen", value: stale.length, note: `${STALE_DAYS}+ gündür güncellenmeyen`, icon: CircleAlertIcon, tone: "text-rose-300 bg-rose-500/10" },
  ];

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_32rem)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button variant="ghost" size="icon" nativeButton={false} className="mt-0.5" render={<Link href={`/workspace/${workspaceId}`} aria-label="Panoya dön"><ArrowLeftIcon /></Link>} />
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase"><ChartNoAxesCombinedIcon className="size-3.5" />Workspace sağlığı</div>
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{workspace.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Fikir akışının güncel durumu ve müdahale gerektiren noktalar.</p>
            </div>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href={`/workspace/${workspaceId}`}>Panoya git <ArrowUpRightIcon /></Link>} />
        </header>

        <section aria-label="Sağlık göstergeleri" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="relative gap-3 overflow-hidden border-0 bg-card/80 py-4 backdrop-blur-sm before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/60 before:to-transparent">
              <CardHeader className="flex-row items-center justify-between gap-2 px-4">
                <CardDescription className="text-xs font-medium sm:text-sm">{metric.label}</CardDescription>
                <span className={cn("flex size-8 items-center justify-center rounded-lg", metric.tone)}><metric.icon className="size-4" /></span>
              </CardHeader>
              <CardContent className="px-4">
                <div className="text-2xl font-semibold tracking-tight sm:text-3xl">{metric.value}</div>
                <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{metric.note}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)]">
          <Card className="border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Kolon dağılımı</CardTitle>
              <CardDescription>Fikirlerin süreçte nerede yoğunlaştığını gösterir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.kanban_columns.map((column) => {
                const count = ideaSummaries.filter((idea) => idea.columnTitle === column.title).length;
                return <div key={column.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2"><span className={cn("size-2 rounded-full", STATUS_COLORS[column.status_type])} /><span className="truncate">{column.title}</span></span><span className="font-medium tabular-nums">{count}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-[width]", STATUS_COLORS[column.status_type])} style={{ width: `${count === 0 ? 0 : Math.max(8, (count / maxColumnCount) * 100)}%` }} /></div>
                </div>;
              })}
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Dikkat gerekiyor</CardTitle>
              <CardDescription>Atanmamış, incelemede veya {STALE_DAYS}+ gündür bekleyen aktif fikirler.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {attention.length === 0 ? <EmptyState text="Akışta şu an belirgin bir tıkanma görünmüyor." /> : attention.map((idea) => (
                <Link key={idea.id} href={`/workspace/${workspaceId}?idea=${idea.id}`} className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300"><CircleAlertIcon className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{idea.title}</span><span className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">{idea.isStale && <span>{relativeDate(idea.updatedAt, requestTimestamp)}</span>}{!idea.assigneeId && <span>Atanmamış</span>}<span>{idea.columnTitle}</span></span></span>
                  <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader><CardTitle>Öne çıkan fikirler</CardTitle><CardDescription>Workspace içinde en çok destek alan fikirler.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {topVoted.length === 0 ? <EmptyState text="Henüz oy alan bir fikir yok." /> : topVoted.map((idea, index) => <Link key={idea.id} href={`/workspace/${workspaceId}?idea=${idea.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium">{idea.title}</span><Badge variant="outline">↑ {idea.voteCount}</Badge></Link>)}
            </CardContent>
          </Card>
          <Card className="border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader><CardTitle>Son hareketler</CardTitle><CardDescription>Workspace içindeki en güncel değişiklikler.</CardDescription></CardHeader>
            <CardContent className="space-y-1">
              {activity.items.length === 0 ? <EmptyState text="Henüz bir aktivite kaydı yok." /> : activity.items.slice(0, 6).map((item) => <div key={item.id} className="flex gap-3 border-b border-border/60 py-2.5 last:border-0"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /><span className="min-w-0"><span className="line-clamp-2 text-sm">{item.message}</span><span className="mt-1 block text-xs text-muted-foreground">{relativeDate(item.created_at, requestTimestamp)}</span></span></div>)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-5 text-center"><InboxIcon className="mb-2 size-5 text-muted-foreground" /><p className="text-sm text-muted-foreground">{text}</p></div>;
}
