"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { moveIdea } from "@/app/actions/ideaActions";
import { Column } from "./column";
import { CreateColumnDialog } from "./create-column-dialog";
import { CancellationReasonDialog } from "./cancellation-reason-dialog";
import type { Database } from "@/lib/types/database.types";

type ColumnRow = Database["public"]["Tables"]["kanban_columns"]["Row"];
type IdeaVersion = Database["public"]["Tables"]["idea_versions"]["Row"];

export function Board({
  workspaceId,
  initialColumns,
  versionsByColumn,
}: {
  workspaceId: string;
  initialColumns: ColumnRow[];
  versionsByColumn: Record<string, IdeaVersion[]>;
}) {
  const router = useRouter();
  const [isMovePending, startMoveTransition] = useTransition();
  const [pendingCancellation, setPendingCancellation] = useState<{
    ideaId: string;
    targetColumnId: string;
    ideaTitle: string;
  } | null>(null);

  function moveCard(ideaId: string, targetColumnId: string, cancellationReason?: string) {
    startMoveTransition(async () => {
      try {
        await moveIdea(ideaId, targetColumnId, cancellationReason);
        toast.success("Fikir taşındı");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Fikir taşınamadı");
      }
    });
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;

    const sourceColumnId = result.source.droppableId;
    const targetColumnId = result.destination.droppableId;
    if (sourceColumnId === targetColumnId && result.destination.index === result.source.index) {
      return;
    }

    const ideaId = result.draggableId;
    const targetColumn = initialColumns.find((c) => c.id === targetColumnId);
    const ideaVersion = (versionsByColumn[sourceColumnId] ?? []).find(
      (v) => v.idea_id === ideaId
    );

    if (targetColumn?.status_type === "CANCELLED") {
      setPendingCancellation({
        ideaId,
        targetColumnId,
        ideaTitle: ideaVersion?.title ?? "",
      });
      return;
    }

    moveCard(ideaId, targetColumnId);
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-1 items-start gap-4 overflow-x-auto p-4">
          {initialColumns.map((col) => (
            <Column
              key={col.id}
              workspaceId={workspaceId}
              column={col}
              versions={versionsByColumn[col.id] ?? []}
            />
          ))}
          <CreateColumnDialog workspaceId={workspaceId} nextOrder={initialColumns.length} />
        </div>
      </DragDropContext>

      <CancellationReasonDialog
        open={pendingCancellation !== null}
        ideaTitle={pendingCancellation?.ideaTitle ?? ""}
        isPending={isMovePending}
        onConfirm={(reason) => {
          if (!pendingCancellation) return;
          moveCard(pendingCancellation.ideaId, pendingCancellation.targetColumnId, reason);
          setPendingCancellation(null);
        }}
        onCancel={() => setPendingCancellation(null)}
      />
    </>
  );
}
