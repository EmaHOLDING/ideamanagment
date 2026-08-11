"use client";

import { useState } from "react";
import { TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { tagColorClasses } from "@/lib/status";
import type { Database } from "@/lib/types/database.types";

type Tag = Database["public"]["Tables"]["tags"]["Row"];

export function TagPicker({
  availableTags,
  selectedTagIds,
  onChange,
}: {
  availableTags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedTags = availableTags.filter((t) => selectedTagIds.includes(t.id));

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
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
          {availableTags.map((tag) => (
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
              Workspace&apos;te henüz etiket yok. Etiketleri workspace ayarlarından
              ekleyebilirsiniz.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
