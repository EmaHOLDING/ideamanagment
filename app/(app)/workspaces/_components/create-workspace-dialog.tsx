"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { createWorkspace } from "@/app/actions/workspaceActions";

type Template = { id: string; title: string };

const DESCRIPTION_MAX_LENGTH = 250;

export function CreateWorkspaceDialog({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<string>("blank");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const workspace = await createWorkspace(
          title,
          templateId === "blank" ? undefined : templateId,
          description.trim() || undefined
        );
        toast.success("Workspace oluşturuldu");
        setOpen(false);
        setTitle("");
        setDescription("");
        setTemplateId("blank");
        router.push(`/workspace/${workspace.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Workspace Oluştur</Button>} />
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Workspace</DialogTitle>
            <DialogDescription>
              Bir başlık girin ve isterseniz bir şablon seçin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workspace-title">Başlık</Label>
              <Input
                id="workspace-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Q3 Girişim Fikirleri"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="workspace-description">Açıklama (opsiyonel)</Label>
                <span className="text-xs text-muted-foreground">
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              <Textarea
                id="workspace-description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                placeholder="Bu workspace ne için kullanılıyor?"
                maxLength={DESCRIPTION_MAX_LENGTH}
                className="min-h-16 resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Şablon</Label>
              <Select
                value={templateId}
                onValueChange={(value) => setTemplateId(value ?? "blank")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Şablon seçin">
                    {(v: string) =>
                      v === "blank" ? "Boş board" : templates.find((t) => t.id === v)?.title
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Boş board</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              Oluştur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
