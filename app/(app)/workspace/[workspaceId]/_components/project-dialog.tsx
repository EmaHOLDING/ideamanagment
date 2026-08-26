"use client";

import { useId, useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";
import { FolderKanbanIcon, LoaderCircleIcon } from "lucide-react";
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
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { createProject, updateProject, type ProjectFormData } from "@/app/actions/projectActions";
import type { Database } from "@/lib/types/database.types";
import { PROJECT_COLORS } from "@/lib/project-colors";

type Project = Database["public"]["Tables"]["projects"]["Row"];

type ProjectDialogProps =
  | {
      mode: "create";
      workspaceId: string;
      trigger: ReactElement;
      onCreated: (project: Project) => void;
    }
  | {
      mode: "edit";
      project: Project;
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onUpdated: (project: Project) => void;
    };

export function ProjectDialog(props: ProjectDialogProps) {
  const fieldId = useId();
  const initial = props.mode === "edit" ? props.project : undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.mode === "edit" ? props.open : internalOpen;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [problemStatement, setProblemStatement] = useState(initial?.problem_statement ?? "");
  const [targetAudience, setTargetAudience] = useState(initial?.target_audience ?? "");
  const [color, setColor] = useState(initial?.color ?? "indigo");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    const fresh = props.mode === "edit" ? props.project : undefined;
    setName(fresh?.name ?? "");
    setDescription(fresh?.description ?? "");
    setProblemStatement(fresh?.problem_statement ?? "");
    setTargetAudience(fresh?.target_audience ?? "");
    setColor(fresh?.color ?? "indigo");
  }

  function onOpenChange(next: boolean) {
    if (next && !open) resetForm();
    if (props.mode === "edit") {
      props.onOpenChange(next);
    } else {
      setInternalOpen(next);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: ProjectFormData = {
      name,
      description: description || null,
      problemStatement: problemStatement || null,
      targetAudience: targetAudience || null,
      color,
    };

    startTransition(async () => {
      try {
        if (props.mode === "create") {
          const created = await createProject(props.workspaceId, data);
          toast.success("Proje oluşturuldu");
          props.onCreated(created);
          setName("");
          setDescription("");
          setProblemStatement("");
          setTargetAudience("");
          setColor("indigo");
        } else {
          const updated = await updateProject(props.project.id, data);
          toast.success("Proje güncellendi");
          props.onUpdated(updated);
        }
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {props.mode === "create" && (
        <DialogTrigger render={props.trigger} nativeButton />
      )}
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-4">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <FolderKanbanIcon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <DialogTitle>{props.mode === "create" ? "Yeni Proje" : "Projeyi Düzenle"}</DialogTitle>
                <DialogDescription>
                  Bu projeye bağlanan fikirler, aşağıdaki problem/hedef kitle tanımını
                  varsayılan olarak miras alır.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${fieldId}-name`}>Proje Adı</Label>
              <Input
                id={`${fieldId}-name`}
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Açıklama</Label>
              <TiptapEditor content={description} onChange={setDescription} compact />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${fieldId}-problem`}>Ana Problem Tanımı</Label>
              <Textarea
                id={`${fieldId}-problem`}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                className="min-h-16 resize-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${fieldId}-audience`}>Ana Hedef Kitle</Label>
              <Textarea
                id={`${fieldId}-audience`}
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="min-h-16 resize-none"
              />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Proje Rengi</legend>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-label={item.label}
                    aria-pressed={color === item.value}
                    title={item.label}
                    onClick={() => setColor(item.value)}
                    className="size-8 rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      backgroundColor: item.hex,
                      borderColor: color === item.value ? "var(--foreground)" : "transparent",
                    }}
                  />
                ))}
              </div>
            </fieldset>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending && <LoaderCircleIcon className="animate-spin" />}
              {props.mode === "create" ? "Oluştur" : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
