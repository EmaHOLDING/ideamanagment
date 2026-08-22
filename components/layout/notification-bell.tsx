"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeftRightIcon,
  AtSignIcon,
  BellIcon,
  CheckCheckIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  UserRoundPlusIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotifications, markAsRead, markAllAsRead } from "@/app/actions/notificationActions";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

type Notification = Awaited<ReturnType<typeof getNotifications>>["items"][number];

const NOTIFICATION_ICONS = {
  mention: AtSignIcon,
  idea_assigned: UserRoundPlusIcon,
  comment_added: MessageCircleIcon,
  idea_moved: ArrowLeftRightIcon,
  workspace_joined: UsersIcon,
} as const;

function formatNotificationTime(value: string) {
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

export function NotificationBell({
  currentUserId,
  initialItems,
  initialNextCursor,
}: {
  currentUserId: string;
  initialItems: Notification[];
  initialNextCursor: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  useRealtimeSubscription(
    `notifications-${currentUserId}`,
    [{ table: "notifications", filter: `user_id=eq.${currentUserId}` }],
    (payload) => {
      if (payload.eventType !== "INSERT") return;
      const row = payload.new as Notification;
      setItems((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]));
    }
  );

  const sortedItems = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const unreadCount = sortedItems.filter((n) => !n.is_read).length;
  const unreadItems = sortedItems.filter((n) => !n.is_read);
  const readItems = sortedItems.filter((n) => n.is_read);

  function renderNotificationItem(notification: Notification) {
    const Icon =
      NOTIFICATION_ICONS[notification.type as keyof typeof NOTIFICATION_ICONS] ?? BellIcon;

    return (
      <DropdownMenuItem
        key={notification.id}
        onClick={() => onItemClick(notification)}
        className={
          "group/notification relative items-start gap-3 rounded-lg border px-3 py-3 transition-colors " +
          (notification.is_read
            ? "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/30"
            : "border-primary/10 bg-gradient-to-r from-primary/[0.09] to-primary/[0.025] shadow-[0_1px_0_rgb(255_255_255/0.02)_inset] hover:border-primary/20 hover:from-primary/[0.12]")
        }
      >
        {!notification.is_read && (
          <span
            aria-hidden
            className="absolute top-3 bottom-3 left-0 w-0.5 rounded-full bg-primary"
          />
        )}
        <span
          className={
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors " +
            (notification.is_read
              ? "bg-muted/40 text-muted-foreground ring-border/60 group-hover/notification:text-foreground"
              : "bg-primary/12 text-primary ring-primary/15")
          }
        >
          <Icon className="size-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span
            className={
              "text-sm leading-snug break-words " +
              (notification.is_read ? "text-muted-foreground" : "font-medium text-foreground")
            }
          >
            {notification.message}
          </span>
          <time
            dateTime={notification.created_at}
            title={new Date(notification.created_at).toLocaleString("tr-TR")}
            className="text-[0.68rem] text-muted-foreground/70"
          >
            {formatNotificationTime(notification.created_at)}
          </time>
        </div>
      </DropdownMenuItem>
    );
  }

  function onItemClick(notification: Notification) {
    // Bazı bildirimler (örn. "workspace'e katıldı") belirli bir fikirle
    // ilişkili değil — idea_id bu durumda null olabiliyor.
    router.push(
      notification.idea_id
        ? `/workspace/${notification.workspace_id}?idea=${notification.idea_id}`
        : `/workspace/${notification.workspace_id}`
    );

    if (notification.is_read) return;
    setItems((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
    );
    startTransition(async () => {
      try {
        await markAsRead(notification.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Bildirim güncellenemedi");
      }
    });
  }

  function onMarkAllAsRead() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    startTransition(async () => {
      try {
        await markAllAsRead();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Bildirimler güncellenemedi");
      }
    });
  }

  function onLoadMore() {
    if (!nextCursor) return;
    startTransition(async () => {
      try {
        const res = await getNotifications(nextCursor);
        setItems((prev) => [...prev, ...res.items]);
        setNextCursor(res.nextCursor);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Bildirimler yüklenemedi");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" className="relative rounded-full">
            <BellIcon />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="w-[min(24rem,calc(100vw-1rem))] overflow-hidden bg-gradient-to-br from-popover via-popover to-primary/[0.025] p-0"
      >
        <DropdownMenuGroup>
          <div className="relative flex items-center justify-between gap-3 px-3.5 py-3">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                <BellIcon className="size-3.5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <DropdownMenuLabel className="p-0 text-sm font-semibold">
                  Bildirimler
                </DropdownMenuLabel>
                <span className="text-[0.68rem] text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : "Her şey güncel"}
                </span>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                disabled={isPending}
                onClick={onMarkAllAsRead}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {isPending ? <LoaderCircleIcon className="animate-spin" /> : <CheckCheckIcon />}
                <span className="hidden sm:inline">Tümünü okundu yap</span>
                <span className="sm:hidden">Okundu yap</span>
              </Button>
            )}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-0" />
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-9 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground ring-1 ring-border/60">
              <BellIcon className="size-4" />
            </span>
            <p className="text-sm font-medium">Yeni bildirim yok</p>
            <p className="max-w-52 text-xs leading-relaxed text-muted-foreground">
              Fikirlerinizdeki önemli gelişmeler burada görünecek.
            </p>
          </div>
        )}
        {items.length > 0 && (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto p-2 sm:max-h-96">
            {unreadItems.length > 0 && (
              <section aria-labelledby="new-notifications-title">
                <p
                  id="new-notifications-title"
                  className="px-1.5 pb-1.5 text-[0.62rem] font-semibold tracking-[0.08em] text-primary uppercase"
                >
                  Yeni
                </p>
                <div className="space-y-1">{unreadItems.map(renderNotificationItem)}</div>
              </section>
            )}
            {readItems.length > 0 && (
              <section aria-labelledby="earlier-notifications-title">
                <p
                  id="earlier-notifications-title"
                  className="px-1.5 pb-1.5 text-[0.62rem] font-semibold tracking-[0.08em] text-muted-foreground/70 uppercase"
                >
                  Daha önce
                </p>
                <div className="space-y-1">{readItems.map(renderNotificationItem)}</div>
              </section>
            )}
          </div>
        )}
        {nextCursor && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <DropdownMenuItem
              onClick={onLoadMore}
              className="justify-center rounded-none px-3 py-2.5 text-xs font-medium text-muted-foreground"
            >
              {isPending && <LoaderCircleIcon className="animate-spin" />}
              Daha fazla bildirim yükle
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
