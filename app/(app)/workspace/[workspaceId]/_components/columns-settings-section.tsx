"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { GripVerticalIcon, LayoutGridIcon, LoaderCircleIcon, SaveIcon } from "lucide-react";
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
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LayoutGridIcon className="size-4" />
            </span>
            <div>
              <h2 className="font-semibold">Kolonlar</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
            Kolonları sürükleyerek sıralayın veya adlarını düzenleyin.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
            {columns.length} kolon
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="settings-columns">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
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
                            "group flex flex-col gap-2 rounded-lg border bg-background p-2.5 transition-colors hover:border-border/80 hover:bg-accent/20 sm:flex-row sm:items-center",
                            snapshot.isDragging && "shadow-lg ring-1 ring-primary/20"
                          )}
                        >
                          <span
                            {...dragProvided.dragHandleProps}
                            className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent active:cursor-grabbing"
                            aria-label={`${column.title} kolonunu sürükle`}
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
                            className="h-9 min-w-0 flex-1"
                            maxLength={100}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!isDirty || savingId === column.id}
                            onClick={() => onSaveTitle(column)}
                          >
                            {savingId === column.id ? (
                              <LoaderCircleIcon className="animate-spin" />
                            ) : (
                              <SaveIcon />
                            )}
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
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircleIcon className="size-3.5 animate-spin" /> Sıralama kaydediliyor…
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="font-semibold">Şablon olarak kaydet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bu workspace&apos;in mevcut kolon yapısını, ileride yeni workspace&apos;ler
            kurarken kullanılabilecek bir şablon olarak kaydedin.
          </p>
        </div>
        <SaveAsTemplateDialog workspaceId={workspaceId} />
      </section>
    </div>
  );
}
