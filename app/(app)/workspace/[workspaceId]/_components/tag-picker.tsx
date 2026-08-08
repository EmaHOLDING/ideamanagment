"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createTag } from "@/app/actions/tagActions";
import { TAG_COLORS, tagColorClasses } from "@/lib/status";
import type { Database } from "@/lib/types/database.types";

type Tag = Database["public"]["Tables"]["tags"]["Row"];

export function TagPicker({
  workspaceId,
  availableTags,
  selectedTagIds,
  onChange,
  onTagCreated,
}: {
  workspaceId: string;
  availableTags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onTagCreated?: (tag: Tag) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[0].value);
  const [isPending, startTransition] = useTransition();
  const [localTags, setLocalTags] = useState<Tag[]>(availableTags);

  const allTags = localTags.some((t) => !availableTags.some((a) => a.id === t.id))
    ? [...availableTags, ...localTags.filter((t) => !availableTags.some((a) => a.id === t.id))]
    : availableTags;

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  }

  function onCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        const tag = await createTag(workspaceId, name, newTagColor);
        setLocalTags((prev) => [...prev, tag]);
        onTagCreated?.(tag);
        onChange([...selectedTagIds, tag.id]);
        setNewTagName("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Etiket oluşturulamadı");
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <TagIcon /> Etiketler{selectedTags.length > 0 ? ` (${selectedTags.length})` : ""}
          </Button>
        }
      />
      <PopoverContent className="w-64">
        <div className="flex flex-wrap gap-1">
          {selectedTags.length === 0 && (
            <p className="text-xs text-muted-foreground">Henüz etiket seçilmedi.</p>
          )}
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="outline" className={tagColorClasses(tag.color).badgeClass}>
              {tag.name}
            </Badge>
          ))}
        </div>
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {allTags.map((tag) => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selectedTagIds.includes(tag.id)}
                onCheckedChange={() => toggleTag(tag.id)}
              />
              <span className={`size-2 rounded-full ${tagColorClasses(tag.color).dotClass}`} />
              {tag.name}
            </label>
          ))}
          {availableTags.length === 0 && (
            <p className="px-1.5 py-1 text-xs text-muted-foreground">
              Workspace&apos;te henüz etiket yok.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 border-t pt-2">
          <div className="flex gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setNewTagColor(c.value)}
                className={`size-4 rounded-full ${c.dotClass} ${
                  newTagColor === c.value ? "ring-2 ring-ring ring-offset-1 ring-offset-popover" : ""
                }`}
                aria-label={c.value}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Yeni etiket"
              className="h-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCreateTag();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={isPending || !newTagName.trim()}
              onClick={onCreateTag}
            >
              <PlusIcon />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
