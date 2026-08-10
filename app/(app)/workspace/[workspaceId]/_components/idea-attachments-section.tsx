"use client";

import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { toast } from "sonner";
import {
  UploadIcon,
  FileIcon,
  FileTextIcon,
  FileArchiveIcon,
  ImageIcon,
  Trash2Icon,
  DownloadIcon,
  PaperclipIcon,
  EyeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getAttachmentsForIdea,
  uploadAttachment,
  softDeleteAttachment,
  undoDeleteAttachment,
  hardDeleteAttachment,
} from "@/app/actions/attachmentActions";
import { MAX_ATTACHMENT_SIZE, formatFileSize } from "@/lib/attachment-client";

type AttachmentItem = Awaited<ReturnType<typeof getAttachmentsForIdea>>[number];

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="size-4" />;
  if (mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
    return <FileArchiveIcon className="size-4" />;
  }
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("wordprocessingml") ||
    mimeType.startsWith("text/")
  ) {
    return <FileTextIcon className="size-4" />;
  }
  return <FileIcon className="size-4" />;
}

function isPreviewable(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

export function IdeaAttachmentsSection({
  ideaId,
  currentUserId,
  canContribute,
  canManageContent,
}: {
  ideaId: string;
  currentUserId: string;
  canContribute: boolean;
  canManageContent: boolean;
}) {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, startUploadTransition] = useTransition();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<AttachmentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hardDeleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    let cancelled = false;
    getAttachmentsForIdea(ideaId)
      .then((res) => {
        if (cancelled) return;
        setItems(res);
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Dosyalar yüklenemedi");
      });
    return () => {
      cancelled = true;
    };
  }, [ideaId]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`"${file.name}" 10MB sınırını aşıyor.`);
        continue;
      }
      startUploadTransition(async () => {
        try {
          const formData = new FormData();
          formData.append("file", file);
          await uploadAttachment(ideaId, formData);
          const res = await getAttachmentsForIdea(ideaId);
          setItems(res);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `"${file.name}" yüklenemedi`);
        }
      });
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (!canContribute) return;
    handleFiles(e.dataTransfer.files);
  }

  function onConfirmDelete() {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    setDeleteTargetId(null);

    const index = items.findIndex((a) => a.id === targetId);
    if (index === -1) return;
    const removed = items[index];
    setItems((prev) => prev.filter((a) => a.id !== targetId));

    function reinsert() {
      setItems((prev) => {
        const next = prev.slice();
        next.splice(index, 0, removed);
        return next;
      });
    }

    function clearHardDeleteTimer() {
      clearTimeout(hardDeleteTimers.current[targetId]);
      delete hardDeleteTimers.current[targetId];
    }

    function onUndo() {
      clearHardDeleteTimer();
      reinsert();
      undoDeleteAttachment(targetId).catch((err) => {
        setItems((prev) => prev.filter((a) => a.id !== targetId));
        toast.error(err instanceof Error ? err.message : "Dosya geri yüklenemedi");
      });
    }

    toast("Dosya silindi.", {
      position: "bottom-center",
      duration: 30000,
      action: { label: "Geri Al", onClick: onUndo },
    });

    softDeleteAttachment(targetId).catch((err) => {
      clearHardDeleteTimer();
      reinsert();
      toast.error(err instanceof Error ? err.message : "Dosya silinemedi");
    });

    // 30sn'lik undo penceresi süresi dolunca dosya hem DB'den hem Storage'dan
    // kalıcı olarak temizlenir (hard delete). "Geri Al" tıklanırsa bu timer iptal edilir.
    hardDeleteTimers.current[targetId] = setTimeout(() => {
      delete hardDeleteTimers.current[targetId];
      hardDeleteAttachment(targetId).catch(() => {});
    }, 30000);
  }

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        <PaperclipIcon className="size-3.5" /> Ekler ve Dosyalar
      </h3>

      {canContribute && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={
            "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors" +
            (isDragOver ? " border-primary bg-primary/5" : " border-border hover:border-primary/40")
          }
        >
          <UploadIcon className="size-4" />
          {isUploading ? "Yükleniyor..." : "Dosyaları buraya sürükleyin veya seçmek için tıklayın"}
          <span className="text-[0.65rem]">Maks 10MB · Görsel, PDF, DOCX, TXT, MD, ZIP</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {!loaded && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {loaded && items.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz dosya eklenmemiş.</p>
        )}
        {items.map((a) => {
          const canDelete = a.uploaded_by === currentUserId || canManageContent;
          return (
            <div key={a.id} className="flex items-center gap-2 rounded-md border bg-card p-2">
              <div className="text-muted-foreground">
                <FileTypeIcon mimeType={a.mime_type} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                {isPreviewable(a.mime_type) && a.url ? (
                  <button
                    type="button"
                    onClick={() => setPreviewItem(a)}
                    className="truncate text-left text-sm font-medium hover:underline"
                    title={a.file_name}
                  >
                    {a.file_name}
                  </button>
                ) : (
                  <a
                    href={a.url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-medium hover:underline"
                    title={a.file_name}
                  >
                    {a.file_name}
                  </a>
                )}
                <span className="text-[0.7rem] text-muted-foreground">
                  {formatFileSize(a.file_size)} · {a.uploaderFullName ?? "Bilinmeyen kullanıcı"} ·{" "}
                  {new Date(a.created_at).toLocaleDateString("tr-TR")}
                </span>
              </div>
              {a.url && isPreviewable(a.mime_type) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setPreviewItem(a)}
                  aria-label="Görüntüle"
                >
                  <EyeIcon />
                </Button>
              )}
              {a.url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  nativeButton={false}
                  render={
                    <a href={a.url} download={a.file_name} target="_blank" rel="noreferrer" aria-label="İndir">
                      <DownloadIcon />
                    </a>
                  }
                />
              )}
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setDeleteTargetId(a.id)}
                  aria-label="Sil"
                >
                  <Trash2Icon />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dosyayı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu dosyayı silmek istediğinize emin misiniz? Silme sonrası kısa bir süre geri
              alabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirmDelete}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={previewItem !== null} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="w-full overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{previewItem?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-lg bg-muted/30">
            {previewItem?.url && previewItem.mime_type.startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewItem.url}
                alt={previewItem.file_name}
                className="max-h-[75vh] w-auto object-contain"
              />
            )}
            {previewItem?.url && previewItem.mime_type === "application/pdf" && (
              <iframe
                src={previewItem.url}
                title={previewItem.file_name}
                className="h-[75vh] w-full rounded-md border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
