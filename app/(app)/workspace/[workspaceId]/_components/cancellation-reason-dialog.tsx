"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CancellationReasonDialog({
  open,
  ideaTitle,
  isPending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  ideaTitle: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  function onOpenChange(next: boolean) {
    if (!next) {
      setReason("");
      onCancel();
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>İptal Sebebi</DialogTitle>
            <DialogDescription>
              &quot;{ideaTitle}&quot; fikrini İptal durumuna taşımak için bir sebep girmelisiniz.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor="cancellation-reason">Sebep</Label>
            <Textarea
              id="cancellation-reason"
              required
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={isPending || !reason.trim()}>
              Onayla ve Taşı
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
