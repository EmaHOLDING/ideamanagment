"use client";

import { useId, useRef, useState, useTransition, type DragEvent, type ReactElement } from "react";
import { toast } from "sonner";
import { LightbulbIcon, LoaderCircleIcon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { createIdea, updateIdea, type IdeaVersionData } from "@/app/actions/ideaActions";
import { uploadAttachment } from "@/app/actions/attachmentActions";
import { IMPACT_EFFORT_LABELS, type ImpactEffortLevel } from "@/lib/status";
import { MAX_ATTACHMENT_SIZE, formatFileSize } from "@/lib/attachment-client";

const IMPACT_EFFORT_OPTIONS: ImpactEffortLevel[] = ["LOW", "MEDIUM", "HIGH"];

type IdeaDialogProps =
  | {
      mode: "create";
      workspaceId: string;
      columnId: string;
      trigger: ReactElement;
    }
  | {
      mode: "edit";
      ideaId: string;
      initial: IdeaVersionData;
      /** Provide a trigger for uncontrolled usage, or omit and drive via open/onOpenChange. */
      trigger?: ReactElement;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
    };

export function IdeaDialog(props: IdeaDialogProps) {
  const fieldId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const controlledOpen = props.mode === "edit" ? props.open : undefined;
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;

  const initial = props.mode === "edit" ? props.initial : undefined;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [problemStatement, setProblemStatement] = useState(initial?.problemStatement ?? "");
  const [targetAudience, setTargetAudience] = useState(initial?.targetAudience ?? "");
  const [impactScore, setImpactScore] = useState<ImpactEffortLevel>(
    initial?.impactScore ?? "MEDIUM"
  );
  const [effortScore, setEffortScore] = useState<ImpactEffortLevel>(
    initial?.effortScore ?? "MEDIUM"
  );
  const [isPending, startTransition] = useTransition();
  const [submitStage, setSubmitStage] = useState<"saving" | "uploading" | null>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    const fresh = props.mode === "edit" ? props.initial : undefined;
    setTitle(fresh?.title ?? "");
    setContent(fresh?.content ?? "");
    setProblemStatement(fresh?.problemStatement ?? "");
    setTargetAudience(fresh?.targetAudience ?? "");
    setImpactScore(fresh?.impactScore ?? "MEDIUM");
    setEffortScore(fresh?.effortScore ?? "MEDIUM");
    setStagedFiles([]);
  }

  function addStagedFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`"${file.name}" 10MB sınırını aşıyor.`);
        continue;
      }
      accepted.push(file);
    }
    setStagedFiles((prev) => [...prev, ...accepted]);
  }

  function removeStagedFile(index: number) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function onDropFiles(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    addStagedFiles(e.dataTransfer.files);
  }

  function onOpenChange(next: boolean) {
    if (next && !open) resetForm();
    if (props.mode === "edit") {
      props.onOpenChange?.(next);
    }
    if (!isControlled) {
      setInternalOpen(next);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const versionData: IdeaVersionData = {
      title,
      content: content || "",
      problemStatement: problemStatement || null,
      targetAudience: targetAudience || null,
      impactScore,
      effortScore,
    };

    startTransition(async () => {
      setSubmitStage("saving");
      try {
        if (props.mode === "create") {
          const created = await createIdea(props.workspaceId, props.columnId, versionData);
          toast.success("Fikir oluşturuldu");

          if (stagedFiles.length > 0) {
            setSubmitStage("uploading");
            let failedCount = 0;
            for (const file of stagedFiles) {
              try {
                const formData = new FormData();
                formData.append("file", file);
                await uploadAttachment(created.id, formData);
              } catch {
                failedCount++;
              }
            }
            if (failedCount > 0) {
              toast.error(`${failedCount} dosya yüklenemedi.`);
            }
          }
        } else {
          await updateIdea(props.ideaId, versionData);
          toast.success("Fikir güncellendi (yeni versiyon oluşturuldu)");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setSubmitStage(null);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {props.trigger && (
        <DialogTrigger render={props.trigger} nativeButton={props.mode === "create"} />
      )}
      <DialogContent className="max-h-[90dvh] overflow-x-hidden overflow-y-auto bg-gradient-to-br from-popover via-popover to-primary/[0.025] sm:max-w-lg">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-primary/75 to-transparent"
        />
        <form
          onSubmit={onSubmit}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          className="min-w-0 max-w-full overflow-hidden"
        >
          <DialogHeader className="pr-10">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <LightbulbIcon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <DialogTitle>
                  {props.mode === "create" ? "Yeni Fikir" : "Fikri Düzenle"}
                </DialogTitle>
                <DialogDescription>
                  {props.mode === "create"
                    ? "Fikrin özünü yazın; bağlam ve öncelik bilgileriyle güçlendirin."
                    : "Fikrin güncel içeriğini ve değerlendirme bilgilerini düzenleyin."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex min-w-0 max-w-full flex-col gap-3 py-4">
            <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/70 bg-background/30 p-3 shadow-[0_1px_0_rgb(255_255_255/0.02)_inset]">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={`${fieldId}-title`}>Başlık</Label>
              <Input
                id={`${fieldId}-title`}
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label>İçerik</Label>
              <TiptapEditor content={content} onChange={setContent} />
            </div>
            </section>
            <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/60 bg-muted/15 p-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.06em] text-primary uppercase">
                  Bağlam
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Problemi ve bu fikirden etkilenecek kitleyi netleştirin.
                </p>
              </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={`${fieldId}-problem`}>Problem Tanımı</Label>
              <Textarea
                id={`${fieldId}-problem`}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={`${fieldId}-audience`}>Hedef Kitle</Label>
              <Textarea
                id={`${fieldId}-audience`}
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>
            </section>
            <section className="rounded-xl border border-border/60 bg-gradient-to-r from-muted/20 to-primary/[0.035] p-3">
              <p className="mb-3 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                Değerlendirme
              </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Etki</Label>
                <Select
                  value={impactScore}
                  onValueChange={(v) => v && setImpactScore(v as ImpactEffortLevel)}
                >
                  <SelectTrigger>
                    <SelectValue>{(v: ImpactEffortLevel) => IMPACT_EFFORT_LABELS[v]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {IMPACT_EFFORT_OPTIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {IMPACT_EFFORT_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Efor</Label>
                <Select
                  value={effortScore}
                  onValueChange={(v) => v && setEffortScore(v as ImpactEffortLevel)}
                >
                  <SelectTrigger>
                    <SelectValue>{(v: ImpactEffortLevel) => IMPACT_EFFORT_LABELS[v]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {IMPACT_EFFORT_OPTIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {IMPACT_EFFORT_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            </section>

            {props.mode === "create" && (
              <section className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/10 p-3">
                <Label>Ekler ve Dosyalar</Label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDropFiles}
                  onClick={() => fileInputRef.current?.click()}
                  className={
                    "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors" +
                    (isDragOver ? " border-primary bg-primary/8" : " border-border/70 bg-background/25 hover:border-primary/40 hover:bg-primary/[0.025]")
                  }
                >
                  <UploadIcon className="size-4" />
                  Dosyaları buraya sürükleyin veya seçmek için tıklayın
                  <span className="text-[0.65rem]">Maks 10MB · Görsel, PDF, DOCX, TXT, MD, ZIP</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addStagedFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
                {stagedFiles.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {stagedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-2 rounded-md border bg-card p-2"
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-[0.7rem] text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeStagedFile(index)}
                          aria-label="Kaldır"
                        >
                          <XIcon />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending && <LoaderCircleIcon className="animate-spin" />}
              {submitStage === "uploading"
                ? "Dosyalar yükleniyor..."
                : isPending
                  ? props.mode === "create"
                    ? "Oluşturuluyor..."
                    : "Kaydediliyor..."
                  : props.mode === "create"
                    ? "Oluştur"
                    : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
