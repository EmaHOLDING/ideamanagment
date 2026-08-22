"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
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
import { createTag, softDeleteTag, undoDeleteTag, updateTag } from "@/app/actions/tagActions";
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

function TagRow({
  tag,
  isDeleting,
  onDelete,
}: {
  tag: Tag;
  isDeleting: boolean;
  onDelete: (tag: Tag) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <div className="flex items-center gap-2 rounded-md border bg-background p-2">
      <ColorSwatches value={color} onChange={setColor} />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
        }}
        className="h-8 flex-1"
        maxLength={50}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!isDirty || isSaving}
        onClick={onSave}
      >
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
              aria-label="Etiketi sil"
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
              kaldırılır. Silme sonrası kısa bir süre geri alabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={() => onDelete(tag)}>
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  function onDeleteTag(tag: Tag) {
    setDeletingId(tag.id);
    softDeleteTag(tag.id)
      .then(() => {
        const index = tags.findIndex((t) => t.id === tag.id);
        setTags((prev) => prev.filter((t) => t.id !== tag.id));
        router.refresh();

        function onUndo() {
          setTags((prev) => {
            const next = prev.slice();
            next.splice(index, 0, tag);
            return next;
          });
          undoDeleteTag(tag.id)
            .then(() => router.refresh())
            .catch((err) => {
              setTags((prev) => prev.filter((t) => t.id !== tag.id));
              toast.error(err instanceof Error ? err.message : "Etiket geri yüklenemedi");
            });
        }

        toast("Etiket silindi.", {
          position: "bottom-center",
          duration: 30000,
          action: { label: "Geri Al", onClick: onUndo },
        });
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Etiket silinemedi");
      })
      .finally(() => setDeletingId(null));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">Etiketler</h2>
        <p className="text-sm text-muted-foreground">
          Workspace&apos;in etiket havuzunu yönetin — adlarını/renklerini düzenleyin veya
          silin.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {tags.map((tag) => (
          <TagRow
            key={tag.id}
            tag={tag}
            isDeleting={deletingId === tag.id}
            onDelete={onDeleteTag}
          />
        ))}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz etiket yok.</p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t pt-3">
        <ColorSwatches value={newColor} onChange={setNewColor} />
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreate();
          }}
          placeholder="Yeni etiket adı"
          className="h-8 flex-1"
          maxLength={50}
        />
        <Button
          type="button"
          size="sm"
          disabled={isCreating || !newName.trim()}
          onClick={onCreate}
        >
          <PlusIcon /> Ekle
        </Button>
      </div>
    </div>
  );
}
