"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LayoutPanelTopIcon, LoaderCircleIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createColumn } from "@/app/actions/columnActions";
import { STATUS_LABELS, type StatusType } from "@/lib/status";

const STATUS_OPTIONS: StatusType[] = ["DRAFT", "IN_REVIEW", "APPROVED", "CANCELLED", "DONE"];

export function CreateColumnDialog({
  workspaceId,
  nextOrder,
}: {
  workspaceId: string;
  nextOrder: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [statusType, setStatusType] = useState<StatusType>("DRAFT");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createColumn(workspaceId, title, statusType, nextOrder);
        toast.success("Kolon oluşturuldu");
        setOpen(false);
        setTitle("");
        setStatusType("DRAFT");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Kolon oluşturulamadı");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="group relative ml-3 h-36 w-[min(20rem,calc(100vw-1.5rem))] shrink-0 snap-start flex-col gap-2.5 self-center overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.045] text-foreground shadow-[0_1px_0_rgb(255_255_255/0.025)_inset] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/10 hover:text-foreground hover:shadow-lg hover:shadow-black/15 sm:w-72"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform duration-200 group-hover:scale-105">
              <PlusIcon className="size-4" />
            </span>
            <span className="font-semibold">Yeni kolon</span>
            <span className="max-w-44 text-center text-xs leading-relaxed font-normal whitespace-normal text-muted-foreground">
              Akışınıza yeni bir aşama ekleyin
            </span>
          </Button>
        }
      />
      <DialogContent className="overflow-hidden bg-gradient-to-br from-popover via-popover to-primary/[0.035]">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-primary/75 to-transparent"
        />
        <form onSubmit={onSubmit}>
          <DialogHeader className="pr-10">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <LayoutPanelTopIcon className="size-4" />
              </span>
              <div className="flex flex-col gap-1">
                <DialogTitle>Yeni Kolon</DialogTitle>
                <DialogDescription>
                  İş akışınıza yeni bir aşama ve durum ekleyin.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="my-4 flex flex-col gap-4 rounded-xl border border-border/70 bg-background/30 p-3 shadow-[0_1px_0_rgb(255_255_255/0.02)_inset]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="column-title">Başlık</Label>
              <Input
                id="column-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Durum</Label>
              <Select
                value={statusType}
                onValueChange={(v) => v && setStatusType(v as StatusType)}
              >
                <SelectTrigger>
                  <SelectValue>{(v: StatusType) => STATUS_LABELS[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
              {isPending ? "Oluşturuluyor..." : "Kolon oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
