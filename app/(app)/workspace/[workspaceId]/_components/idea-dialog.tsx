"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { IMPACT_EFFORT_LABELS, type ImpactEffortLevel } from "@/lib/status";

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

  function resetForm() {
    const fresh = props.mode === "edit" ? props.initial : undefined;
    setTitle(fresh?.title ?? "");
    setContent(fresh?.content ?? "");
    setProblemStatement(fresh?.problemStatement ?? "");
    setTargetAudience(fresh?.targetAudience ?? "");
    setImpactScore(fresh?.impactScore ?? "MEDIUM");
    setEffortScore(fresh?.effortScore ?? "MEDIUM");
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
          await createIdea(props.workspaceId, props.columnId, versionData);
          toast.success("Fikir oluşturuldu");
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
