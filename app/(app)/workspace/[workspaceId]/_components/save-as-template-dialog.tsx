"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { createTemplateFromBoard } from "@/app/actions/templateActions";

export function SaveAsTemplateDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createTemplateFromBoard(workspaceId, title);
        toast.success("Şablon olarak kaydedildi");
        setOpen(false);
        setTitle("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Şablon kaydedilemedi");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Şablon Olarak Kaydet</Button>} />
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Şablon Olarak Kaydet</DialogTitle>
            <DialogDescription>
              Bu board&apos;un mevcut kolon yapısı, sizin kendi şablonunuz olarak kaydedilir.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor="template-title">Şablon Adı</Label>
            <Input
              id="template-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Benim Kanban Şablonum"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
