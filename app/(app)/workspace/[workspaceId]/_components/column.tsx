"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon, PlusIcon, InboxIcon } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { STATUS_LABELS, STATUS_BADGE_VARIANT, STATUS_DOT_CLASS } from "@/lib/status";
import { deleteColumn } from "@/app/actions/columnActions";
import { IdeaCard } from "./idea-card";
import { IdeaDialog } from "./idea-dialog";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import type { Database } from "@/lib/types/database.types";

type ColumnRow = Database["public"]["Tables"]["kanban_columns"]["Row"];
type IdeaVersion = Database["public"]["Tables"]["idea_versions"]["Row"];
type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type Tag = Database["public"]["Tables"]["tags"]["Row"];

export function Column({
  workspaceId,
  column,
  versions,
  assigneeByIdea,
  tagsByIdea,
  voteCountByIdea,
  hasVotedByIdea,
  createdByIdea,
  currentUserId,
  members,
  tags,
  canManageContent,
  isViewer,
  canContribute,
  autoOpenIdeaId,
  hideIdea,
  showIdea,
}: {
  workspaceId: string;
  column: ColumnRow;
  versions: IdeaVersion[];
  assigneeByIdea: Record<string, string | null>;
  tagsByIdea: Record<string, Tag[]>;
  voteCountByIdea: Record<string, number>;
  hasVotedByIdea: Record<string, boolean>;
  createdByIdea: Record<string, string>;
  currentUserId: string;
  members: Member[];
  tags: Tag[];
  canManageContent: boolean;
  isViewer: boolean;
  canContribute: boolean;
  autoOpenIdeaId: string | null;
  hideIdea: (ideaId: string) => void;
  showIdea: (ideaId: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ideaCount = versions.length;

  function onConfirmDelete() {
    startTransition(async () => {
      try {
        const result = await deleteColumn(column.id);
        if (!result.success) {
          toast.error(
            `Bu kolonda ${result.ideaCount ?? ideaCount} fikir var. Kolonu silmeden önce fikirleri başka bir kolona taşıyın veya silin.`
          );
          setOpen(false);
          return;
        }
        toast.success("Kolon silindi");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Kolon silinemedi");
      }
    });
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[column.status_type]}`} />
          <h2 className="truncate text-sm font-semibold">{column.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant={STATUS_BADGE_VARIANT[column.status_type]}>
            {STATUS_LABELS[column.status_type]}
          </Badge>
          {canManageContent && (
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" size="icon-xs">
                    <Trash2Icon />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Kolonu Sil</AlertDialogTitle>
                  <AlertDialogDescription>
                    {ideaCount > 0
                      ? `Bu kolonda ${ideaCount} adet fikir var. Kolonu silmeden önce fikirleri başka bir kolona taşıyın veya silin.`
                      : `"${column.title}" kolonunu silmek istediğinize emin misiniz?`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  {ideaCount === 0 && (
                    <AlertDialogAction disabled={isPending} onClick={onConfirmDelete}>
                      Sil
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      <Droppable droppableId={column.id} type="CARD" isDropDisabled={isViewer}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={
              "flex min-h-8 flex-col gap-2 rounded-md transition-colors" +
              (snapshot.isDraggingOver ? " bg-accent/50" : "")
            }
          >
            {versions.map((v, index) => (
              <Draggable
                key={v.idea_id}
                draggableId={v.idea_id}
                index={index}
                isDragDisabled={isViewer}
              >
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <IdeaCard
                      workspaceId={workspaceId}
                      version={v}
                      assigneeId={assigneeByIdea[v.idea_id] ?? null}
                      ideaTags={tagsByIdea[v.idea_id] ?? []}
                      voteCount={voteCountByIdea[v.idea_id] ?? 0}
                      hasVoted={hasVotedByIdea[v.idea_id] ?? false}
                      createdBy={createdByIdea[v.idea_id]}
                      currentUserId={currentUserId}
                      canManageContent={canManageContent}
                      canContribute={canContribute}
                      members={members}
                      availableTags={tags}
                      defaultOpen={autoOpenIdeaId === v.idea_id}
                      hideIdea={hideIdea}
                      showIdea={showIdea}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {versions.length === 0 && (
              <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                <InboxIcon className="size-3.5" />
                Bu kolonda fikir yok
              </p>
            )}
          </div>
        )}
      </Droppable>
      {!isViewer && (
        <div className="flex flex-col gap-2">
          <IdeaDialog
            mode="create"
            workspaceId={workspaceId}
            columnId={column.id}
            trigger={
              <Button variant="ghost" size="sm" className="justify-start text-muted-foreground">
                <PlusIcon /> Fikir Ekle
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
