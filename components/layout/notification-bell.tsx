"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellIcon } from "lucide-react";
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
  const [, startTransition] = useTransition();

  useRealtimeSubscription(
    `notifications-${currentUserId}`,
    [{ table: "notifications", filter: `user_id=eq.${currentUserId}` }],
    (payload) => {
      if (payload.eventType !== "INSERT") return;
      const row = payload.new as Notification;
      setItems((prev) => (prev.some((n) => n.id === row.id) ? prev : [row, ...prev]));
    }
  );

  const unreadCount = items.filter((n) => !n.is_read).length;

  function onItemClick(notification: Notification) {
    router.push(`/workspace/${notification.workspace_id}?idea=${notification.idea_id}`);

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
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <div className="flex items-center justify-between px-1.5 py-1">
            <DropdownMenuLabel className="p-0">Bildirimler</DropdownMenuLabel>
            {unreadCount > 0 && (
              <Button variant="ghost" size="xs" onClick={onMarkAllAsRead}>
                Tümünü okundu yap
              </Button>
            )}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">Bildirim yok</p>
        )}
        {items.map((n) => (
          <DropdownMenuItem
            key={n.id}
            onClick={() => onItemClick(n)}
            className={n.is_read ? "opacity-60" : ""}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs">{n.message}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString("tr-TR")}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        {nextCursor && (
          <DropdownMenuItem onClick={onLoadMore}>Daha fazla yükle</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
