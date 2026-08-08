"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
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
          <Button variant="outline" className="h-fit w-72 shrink-0 border-dashed py-6">
            <PlusIcon /> Kolon Ekle
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Kolon</DialogTitle>
            <DialogDescription>Kolon başlığı ve durumunu seçin.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="column-title">Başlık</Label>
              <Input
                id="column-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              Ekle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
