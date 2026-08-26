"use client";

import { useEffect, useState, useTransition } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getActivityLog } from "@/app/actions/activityActions";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

type ActivityRow = Awaited<ReturnType<typeof getActivityLog>>["items"][number];

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

export function ActivityPanel({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

  useRealtimeSubscription(
    `activity-${workspaceId}`,
    [{ table: "activity_log", filter: `workspace_id=eq.${workspaceId}` }],
    (payload) => {
      if (payload.eventType !== "INSERT") return;
      const row = payload.new as ActivityRow;
      setItems((prev) => (prev.some((i) => i.id === row.id) ? prev : [row, ...prev]));
    },
    { enabled: open }
  );

  useEffect(() => {
    if (!open) return;
    getActivityLog(workspaceId)
      .then((res) => {
        setItems(res.items);
        setNextCursor(res.nextCursor);
        setLoaded(true);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Aktivite akışı yüklenemedi");
      });
  }, [open, workspaceId]);

  function onLoadMore() {
    if (!nextCursor) return;
    startLoadMoreTransition(async () => {
      try {
        const res = await getActivityLog(workspaceId, nextCursor);
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
              <p className="text-sm font-medium">Henüz aktivite yok</p>
              <p className="max-w-52 text-xs leading-relaxed text-muted-foreground">
                Workspace&apos;teki hareketler burada görünecek.
              </p>
            </div>
          )}
          {items.length > 0 && <div className="space-y-1">{items.map(renderActivityItem)}</div>}
          {nextCursor && (
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
