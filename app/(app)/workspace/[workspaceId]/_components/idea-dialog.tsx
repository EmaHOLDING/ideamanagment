"use client";

import { useRef, useState, useTransition, type DragEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
  const router = useRouter();
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
    if (next) resetForm();
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
      try {
        if (props.mode === "create") {
          const created = await createIdea(props.workspaceId, props.columnId, versionData);
          toast.success("Fikir oluşturuldu");

          if (stagedFiles.length > 0) {
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
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {props.trigger && (
        <DialogTrigger render={props.trigger} nativeButton={props.mode === "create"} />
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{props.mode === "create" ? "Yeni Fikir" : "Fikri Düzenle"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-title">Başlık</Label>
              <Input
                id="idea-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>İçerik</Label>
              <TiptapEditor content={content} onChange={setContent} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-problem">Problem Tanımı</Label>
              <Textarea
                id="idea-problem"
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="idea-audience">Hedef Kitle</Label>
              <Textarea
                id="idea-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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

            {props.mode === "create" && (
              <div className="flex flex-col gap-2">
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
                    (isDragOver ? " border-primary bg-primary/5" : " border-border hover:border-primary/40")
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
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {props.mode === "create" ? "Oluştur" : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
