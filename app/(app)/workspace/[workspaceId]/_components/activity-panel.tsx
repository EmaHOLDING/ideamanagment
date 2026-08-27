"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ActivityIcon,
  ArchiveIcon,
  ArrowLeftRightIcon,
  FolderKanbanIcon,
  LayoutGridIcon,
  LightbulbIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  PencilIcon,
  SproutIcon,
  TagIcon,
  TagsIcon,
  ThumbsUpIcon,
  Trash2Icon,
  UserRoundPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActivityLog, type ActivityActionGroup } from "@/app/actions/activityActions";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

type ActivityRow = Awaited<ReturnType<typeof getActivityLog>>["items"][number];
type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];

const ALL_ACTORS = "all";
const ALL_ACTIONS = "all";
const ACTION_GROUPS: { value: ActivityActionGroup; label: string; types: string[] }[] = [
  { value: "ideas", label: "Fikir işlemleri", types: ["idea_created", "idea_updated", "idea_moved", "idea_assigned", "idea_voted", "idea_project_updated", "idea_converted_to_project"] },
  { value: "projects", label: "Proje işlemleri", types: ["project_created", "project_deleted", "idea_project_updated", "idea_converted_to_project"] },
  { value: "comments", label: "Yorumlar", types: ["comment_added"] },
  { value: "tags", label: "Etiket işlemleri", types: ["tag_created", "tag_deleted", "idea_tags_updated"] },
  { value: "columns", label: "Kolon işlemleri", types: ["column_created", "column_deleted"] },
  { value: "members", label: "Üye işlemleri", types: ["member_joined"] },
  { value: "archives", label: "Arşiv işlemleri", types: ["idea_archived", "project_archived"] },
];

const ACTIVITY_ICONS = {
  column_created: LayoutGridIcon,
  column_deleted: Trash2Icon,
  comment_added: MessageCircleIcon,
  idea_created: LightbulbIcon,
  idea_updated: PencilIcon,
  idea_moved: ArrowLeftRightIcon,
  idea_assigned: UserRoundPlusIcon,
  idea_voted: ThumbsUpIcon,
  tag_created: TagIcon,
  tag_deleted: Trash2Icon,
  idea_tags_updated: TagsIcon,
  member_joined: UsersIcon,
  project_created: FolderKanbanIcon,
  project_deleted: Trash2Icon,
  idea_project_updated: FolderKanbanIcon,
  idea_converted_to_project: SproutIcon,
  idea_archived: ArchiveIcon,
  project_archived: ArchiveIcon,
} as const;

function formatActivityTime(value: string) {
  const date = new Date(value);
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (elapsedSeconds < 60) return "Az önce";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} dk önce`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)} sa önce`;
  if (elapsedSeconds < 604800) return `${Math.floor(elapsedSeconds / 86400)} gün önce`;

  return date.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityPanel({ workspaceId, members }: { workspaceId: string; members: Member[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [actorId, setActorId] = useState(ALL_ACTORS);
  const [actionGroup, setActionGroup] = useState<string>(ALL_ACTIONS);
  const [isLoadingMore, startLoadMoreTransition] = useTransition();
  const filters = useMemo(() => ({
    actorId: actorId === ALL_ACTORS ? undefined : actorId,
    actionGroup: actionGroup === ALL_ACTIONS ? undefined : actionGroup as ActivityActionGroup,
  }), [actorId, actionGroup]);
  const hasFilters = actorId !== ALL_ACTORS || actionGroup !== ALL_ACTIONS;

  useRealtimeSubscription(
    `activity-${workspaceId}`,
    [{ table: "activity_log", filter: `workspace_id=eq.${workspaceId}` }],
    (payload) => {
      if (payload.eventType !== "INSERT") return;
      const row = payload.new as ActivityRow;
      if (filters.actorId && row.actor_id !== filters.actorId) return;
      if (filters.actionGroup && !ACTION_GROUPS.find((group) => group.value === filters.actionGroup)?.types.includes(row.type)) return;
      setItems((prev) => (prev.some((i) => i.id === row.id) ? prev : [row, ...prev]));
    },
    { enabled: open }
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getActivityLog(workspaceId, undefined, filters)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setNextCursor(res.nextCursor);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Aktivite akışı yüklenemedi");
      });
    return () => { cancelled = true; };
  }, [open, workspaceId, filters]);

  function changeActor(value: string | null) {
    setLoaded(false);
    setActorId(value ?? ALL_ACTORS);
  }

  function changeActionGroup(value: string | null) {
    setLoaded(false);
    setActionGroup(value ?? ALL_ACTIONS);
  }

  function clearFilters() {
    setLoaded(false);
    setActorId(ALL_ACTORS);
    setActionGroup(ALL_ACTIONS);
  }

  function onLoadMore() {
    if (!nextCursor) return;
    startLoadMoreTransition(async () => {
      try {
        const res = await getActivityLog(workspaceId, nextCursor, filters);
        setItems((prev) => [...prev, ...res.items]);
        setNextCursor(res.nextCursor);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Aktivite akışı yüklenemedi");
      }
    });
  }

  function onItemClick(item: ActivityRow) {
    if (!item.idea_id) return;
    setOpen(false);
    router.push(`${pathname}?idea=${item.idea_id}`, { scroll: false });
  }

  function renderActivityItem(item: ActivityRow) {
    const Icon = ACTIVITY_ICONS[item.type as keyof typeof ACTIVITY_ICONS] ?? ActivityIcon;
    const clickable = item.idea_id !== null;

    return (
      <div
        key={item.id}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? () => onItemClick(item) : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onItemClick(item);
                }
              }
            : undefined
        }
        className={
          "group/activity flex items-start gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-border/60 hover:bg-muted/30" +
          (clickable ? " cursor-pointer" : "")
        }
      >
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground ring-1 ring-border/60 transition-colors group-hover/activity:text-foreground">
          <Icon className="size-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-sm leading-snug break-words text-foreground">{item.message}</span>
          <time
            dateTime={item.created_at}
            title={new Date(item.created_at).toLocaleString("tr-TR")}
            className="text-[0.68rem] text-muted-foreground/70"
          >
            {formatActivityTime(item.created_at)}
          </time>
        </div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" aria-label="Aktivite">
            <ActivityIcon /> <span className="hidden sm:inline">Aktivite</span>
          </Button>
        }
      />
      <SheetContent className="gap-0 overflow-hidden bg-gradient-to-br from-popover via-popover to-primary/[0.025] p-0">
        <div className="relative flex items-center gap-2.5 border-b px-4 py-3.5">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
          />
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <ActivityIcon className="size-3.5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <SheetTitle className="p-0 text-sm font-semibold">Aktivite Akışı</SheetTitle>
            <span className="text-[0.68rem] text-muted-foreground">
              Workspace&apos;teki son hareketler
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 border-b bg-muted/15 px-3 py-2.5">
          <Select value={actorId} onValueChange={changeActor}>
            <SelectTrigger size="sm" aria-label="Aktiviteleri kişiye göre filtrele"><SelectValue>{actorId === ALL_ACTORS ? "Tüm kişiler" : members.find((member) => member.user_id === actorId)?.fullName ?? "Kişi"}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ACTORS}>Tüm kişiler</SelectItem>
              {members.map((member) => <SelectItem key={member.user_id} value={member.user_id}>{member.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actionGroup} onValueChange={changeActionGroup}>
            <SelectTrigger size="sm" aria-label="Aktiviteleri eyleme göre filtrele"><SelectValue>{actionGroup === ALL_ACTIONS ? "Tüm eylemler" : ACTION_GROUPS.find((group) => group.value === actionGroup)?.label}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ACTIONS}>Tüm eylemler</SelectItem>
              {ACTION_GROUPS.map((group) => <SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon-sm" disabled={!hasFilters} aria-label="Aktivite filtrelerini temizle" onClick={clearFilters}><XIcon /></Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!loaded && (
            <div className="flex items-center justify-center gap-2 py-9 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" /> Yükleniyor...
            </div>
          )}
          {loaded && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-9 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground ring-1 ring-border/60">
                <ActivityIcon className="size-4" />
              </span>
              <p className="text-sm font-medium">{hasFilters ? "Eşleşen aktivite yok" : "Henüz aktivite yok"}</p>
              <p className="max-w-52 text-xs leading-relaxed text-muted-foreground">
                {hasFilters ? "Filtreleri değiştirerek diğer hareketleri görüntüleyebilirsiniz." : "Workspace'teki hareketler burada görünecek."}
              </p>
            </div>
          )}
          {loaded && items.length > 0 && <div className="space-y-1">{items.map(renderActivityItem)}</div>}
          {loaded && nextCursor && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLoadingMore}
              onClick={onLoadMore}
              className="mt-1 w-full justify-center text-xs font-medium text-muted-foreground"
            >
              {isLoadingMore && <LoaderCircleIcon className="animate-spin" />}
              Daha fazla aktivite yükle
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
