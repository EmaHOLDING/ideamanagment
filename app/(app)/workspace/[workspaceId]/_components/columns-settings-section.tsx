"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_DOT_CLASS } from "@/lib/status";
import { reorderColumns, updateColumn } from "@/app/actions/columnActions";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";
import type { Database } from "@/lib/types/database.types";

type ColumnRow = Database["public"]["Tables"]["kanban_columns"]["Row"];

export function ColumnsSettingsSection({
  workspaceId,
  initialColumns,
}: {
  workspaceId: string;
  initialColumns: ColumnRow[];
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<ColumnRow[]>(
    [...initialColumns].sort((a, b) => a.order - b.order)
  );
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [isReordering, startReorderTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const previous = columns;
    const next = [...columns];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setColumns(next);

    startReorderTransition(async () => {
      try {
        await reorderColumns(
          workspaceId,
          next.map((c) => c.id)
        );
        router.refresh();
      } catch (err) {
        setColumns(previous);
        toast.error(err instanceof Error ? err.message : "Kolon sırası güncellenemedi");
      }
    });
  }

  function onSaveTitle(column: ColumnRow) {
    const draft = (titleDrafts[column.id] ?? column.title).trim();
    if (!draft || draft === column.title) return;

    setSavingId(column.id);
    updateColumn(column.id, draft)
      .then(() => {
        setColumns((prev) => prev.map((c) => (c.id === column.id ? { ...c, title: draft } : c)));
        setTitleDrafts((prev) => {
          const next = { ...prev };
          delete next[column.id];
          return next;
        });
        toast.success("Kolon adı güncellendi");
        router.refresh();
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Kolon adı güncellenemedi");
      })
      .finally(() => setSavingId(null));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Kolonlar</h2>
          <p className="text-sm text-muted-foreground">
            Kolonları sürükleyerek sıralayın veya adlarını düzenleyin.
          </p>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="settings-columns">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col gap-1.5"
              >
                {columns.map((column, index) => {
                  const draft = titleDrafts[column.id] ?? column.title;
                  const isDirty = draft.trim().length > 0 && draft.trim() !== column.title;
                  return (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={cn(
                            "flex items-center gap-2 rounded-md border bg-background p-2",
                            snapshot.isDragging && "shadow-md"
                          )}
                        >
                          <span
                            {...dragProvided.dragHandleProps}
                            className="flex size-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                          >
                            <GripVerticalIcon className="size-4" />
                          </span>
                          <span
                            className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[column.status_type]}`}
                          />
                          <Input
                            value={draft}
                            onChange={(e) =>
                              setTitleDrafts((prev) => ({ ...prev, [column.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") onSaveTitle(column);
                            }}
                            className="h-8 flex-1"
                            maxLength={100}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!isDirty || savingId === column.id}
                            onClick={() => onSaveTitle(column)}
                          >
                            Kaydet
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                {columns.length === 0 && (
                  <p className="text-sm text-muted-foreground">Henüz kolon yok.</p>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        {isReordering && (
          <p className="text-xs text-muted-foreground">Sıralama kaydediliyor…</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Şablon Olarak Kaydet</h2>
          <p className="text-sm text-muted-foreground">
            Bu workspace&apos;in mevcut kolon yapısını, ileride yeni workspace&apos;ler
            kurarken kullanılabilecek bir şablon olarak kaydedin.
          </p>
        </div>
        <SaveAsTemplateDialog workspaceId={workspaceId} />
      </div>
    </div>
  );
}
