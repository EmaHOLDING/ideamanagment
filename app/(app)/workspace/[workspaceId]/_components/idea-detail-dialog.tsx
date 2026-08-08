"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, HistoryIcon, TargetIcon, MessageSquareIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import { deleteIdea, type IdeaVersionData } from "@/app/actions/ideaActions";
import { IMPACT_EFFORT_LABELS } from "@/lib/status";
import { IdeaDialog } from "./idea-dialog";
import { VersionHistoryDialog } from "./version-history-dialog";
import { CommentsPanel } from "./comments-panel";

export function IdeaDetailDialog({
  ideaId,
  data,
  trigger,
}: {
  ideaId: string;
  data: IdeaVersionData;
  trigger: ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function onConfirmDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteIdea(ideaId);
        toast.success("Fikir silindi");
        setDeleteOpen(false);
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Fikir silinemedi");
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={trigger} nativeButton={false} />
        <DialogContent
          showCloseButton
          className="grid h-[85vh] max-h-[85vh] w-full grid-rows-[auto_1fr] gap-0 overflow-hidden p-0 sm:max-w-4xl"
        >
          <DialogHeader className="flex-row items-start justify-between gap-4 border-b bg-muted/30 px-5 py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <DialogTitle className="text-lg leading-snug break-words pr-1">
                {data.title}
              </DialogTitle>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">Etki: {IMPACT_EFFORT_LABELS[data.impactScore ?? "MEDIUM"]}</Badge>
                <Badge variant="outline">Efor: {IMPACT_EFFORT_LABELS[data.effortScore ?? "MEDIUM"]}</Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pr-9">
              <VersionHistoryDialog
                ideaId={ideaId}
                trigger={
                  <Button type="button" variant="ghost" size="sm">
                    <HistoryIcon /> Geçmiş
                  </Button>
                }
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <PencilIcon /> Düzenle
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon /> Sil
              </Button>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 grid-cols-[280px_1fr] overflow-hidden">
            <div className="flex min-h-0 flex-col border-r bg-muted/20">
              <div className="flex items-center gap-1.5 border-b px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <MessageSquareIcon className="size-3.5" /> Yorumlar
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="p-4">
                  <CommentsPanel ideaId={ideaId} showHeading={false} />
                </div>
              </ScrollArea>
            </div>

            <ScrollArea className="min-h-0">
              <div className="flex flex-col gap-6 p-6">
                {data.problemStatement && (
                  <section className="flex flex-col gap-1.5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Problem Tanımı
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {data.problemStatement}
                    </p>
                  </section>
                )}

                {data.targetAudience && (
                  <section className="flex flex-col gap-1.5">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <TargetIcon className="size-3.5" /> Hedef Kitle
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {data.targetAudience}
                    </p>
                  </section>
                )}

                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    İçerik
                  </h3>
                  <div className="rounded-lg border bg-card p-4">
                    <TiptapContentView content={data.content} />
                  </div>
                </section>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <IdeaDialog
        mode="edit"
        ideaId={ideaId}
        initial={data}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fikri Sil</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{data.title}&quot; fikrini ve tüm versiyon/yorum geçmişini silmek istediğinize
              emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={onConfirmDelete}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
