"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircleIcon, PlusIcon, SaveIcon, TagIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createTag, deleteTag, updateTag } from "@/app/actions/tagActions";
import { TAG_COLORS } from "@/lib/status";
import type { Database } from "@/lib/types/database.types";

type Tag = Database["public"]["Tables"]["tags"]["Row"];

function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      {TAG_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={`size-5 rounded-full ${c.dotClass} ${
            value === c.value ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : ""
          }`}
          aria-label={c.value}
        />
      ))}
    </div>
  );
}

function TagRow({ tag }: { tag: Tag }) {
  const router = useRouter();
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const isDirty = name.trim().length > 0 && (name.trim() !== tag.name || color !== tag.color);

  function onSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSaving(true);
    updateTag(tag.id, trimmed, color)
      .then(() => {
        toast.success("Etiket güncellendi");
        router.refresh();
      })
      .catch((err) => {
        setName(tag.name);
        setColor(tag.color);
        toast.error(err instanceof Error ? err.message : "Etiket güncellenemedi");
      })
      .finally(() => setIsSaving(false));
  }

  function onDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteTag(tag.id);
        toast.success("Etiket silindi");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Etiket silinemedi");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2.5 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center">
      <ColorSwatches value={color} onChange={setColor} />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
        }}
        className="h-9 min-w-0 flex-1"
        maxLength={50}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!isDirty || isSaving}
        onClick={onSave}
      >
        {isSaving ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
        Kaydet
      </Button>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isDeleting}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`${tag.name} etiketini sil`}
            >
              <Trash2Icon />
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Etiketi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{tag.name}&apos; etiketi silinsin mi? Bu etikete sahip fikirlerden de
              kaldırılır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={onDelete}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function TagsSettingsSection({
  workspaceId,
  initialTags,
}: {
  workspaceId: string;
  initialTags: Tag[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(TAG_COLORS[0].value);
  const [isCreating, setIsCreating] = useState(false);

  function onCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setIsCreating(true);
    createTag(workspaceId, trimmed, newColor)
      .then((tag) => {
        setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName("");
        toast.success("Etiket oluşturuldu");
        router.refresh();
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Etiket oluşturulamadı");
      })
      .finally(() => setIsCreating(false));
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TagIcon className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold">Etiketler</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Fikirleri sınıflandırmak için etiket adlarını ve renklerini yönetin.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
          {tags.length} etiket
        </span>
      </div>

      <div>
        {tags.map((tag) => (
          <TagRow key={tag.id} tag={tag} />
        ))}
        {tags.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Henüz etiket yok. İlk etiketi aşağıdan ekleyebilirsiniz.
          </p>
        )}
      </div>

      <div className="border-t bg-muted/20 px-4 py-4 sm:px-5">
        <p className="mb-3 text-sm font-medium">Yeni etiket</p>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <ColorSwatches value={newColor} onChange={setNewColor} />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreate();
            }}
            placeholder="Etiket adı"
            className="h-9 min-w-0 flex-1"
            maxLength={50}
          />
          <Button
            type="button"
            size="sm"
            disabled={isCreating || !newName.trim()}
            onClick={onCreate}
          >
            {isCreating ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
            Etiket ekle
          </Button>
        </div>
      </div>
    </section>
  );
}
