"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { ActivityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getActivityLog } from "@/app/actions/activityActions";

type ActivityRow = Awaited<ReturnType<typeof getActivityLog>>["items"][number];

export function ActivityPanel({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm">
            <ActivityIcon /> Aktivite
          </Button>
        }
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Aktivite Akışı</SheetTitle>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4">
          <div className="flex flex-col gap-3 pb-4">
            {!loaded && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
            {loaded && items.length === 0 && (
              <p className="text-sm text-muted-foreground">Henüz aktivite yok.</p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex flex-col gap-0.5 border-b pb-2.5 last:border-b-0">
                <p className="text-sm leading-relaxed">{item.message}</p>
                <span className="text-[0.7rem] text-muted-foreground">
                  {new Date(item.created_at).toLocaleString("tr-TR")}
                </span>
              </div>
            ))}
            {nextCursor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoadingMore}
                onClick={onLoadMore}
              >
                Daha Fazla Yükle
              </Button>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
