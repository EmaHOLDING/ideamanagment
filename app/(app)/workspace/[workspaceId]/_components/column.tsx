"use client";

import { PlusIcon, InboxIcon } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_BADGE_VARIANT, STATUS_DOT_CLASS } from "@/lib/status";
import { cn } from "@/lib/utils";
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
  emptyMessage,
  assigneeByIdea,
  tagsByIdea,
  voteCountByIdea,
  hasVotedByIdea,
  createdByIdea,
  commentCountByIdea,
  currentUserId,
  members,
  tags,
  canManageContent,
  isViewer,
  canContribute,
  autoOpenIdeaId,
  pendingMoveIdeaId,
  hideIdea,
  showIdea,
}: {
  workspaceId: string;
  column: ColumnRow;
  versions: IdeaVersion[];
  emptyMessage: string;
  assigneeByIdea: Record<string, string | null>;
  tagsByIdea: Record<string, Tag[]>;
  voteCountByIdea: Record<string, number>;
  hasVotedByIdea: Record<string, boolean>;
  createdByIdea: Record<string, string>;
  commentCountByIdea: Record<string, number>;
  currentUserId: string;
  members: Member[];
  tags: Tag[];
  canManageContent: boolean;
  isViewer: boolean;
  canContribute: boolean;
  autoOpenIdeaId: string | null;
  pendingMoveIdeaId: string | null;
  hideIdea: (ideaId: string) => void;
  showIdea: (ideaId: string) => void;
}) {
  const ideaCount = versions.length;

  return (
    <section
      id={`board-column-${column.id}`}
      aria-label={`${column.title} kolonu, ${ideaCount} fikir`}
      className="flex h-full w-[min(20rem,calc(100vw-1.5rem))] shrink-0 snap-start flex-col border-r last:border-r-0 sm:w-72"
    >
      <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASS[column.status_type]}`} />
          <h2 className="truncate text-sm font-semibold">{column.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant={STATUS_BADGE_VARIANT[column.status_type]}>
            {STATUS_LABELS[column.status_type]}
          </Badge>
        </div>
      </div>
      <Droppable droppableId={column.id} type="CARD" isDropDisabled={isViewer}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={
              "min-h-8 flex-1 overflow-y-auto transition-colors" +
              (snapshot.isDraggingOver ? " bg-accent/50" : "")
            }
          >
            <div className="flex flex-col gap-2 px-3 pb-2">
              {versions.map((v, index) => (
                <Draggable
                  key={v.idea_id}
                  draggableId={v.idea_id}
                  index={index}
                  isDragDisabled={isViewer}
                >
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      aria-busy={pendingMoveIdeaId === v.idea_id}
                      className={cn(
                        "rounded-xl transition-[opacity,filter,box-shadow] duration-150",
                        dragSnapshot.isDragging &&
                          "z-20 rotate-[0.5deg] cursor-grabbing shadow-xl ring-2 ring-primary/30",
                        pendingMoveIdeaId === v.idea_id &&
                          "pointer-events-none animate-pulse opacity-70"
                      )}
                    >
                      <IdeaCard
                        version={v}
                        assigneeId={assigneeByIdea[v.idea_id] ?? null}
                        ideaTags={tagsByIdea[v.idea_id] ?? []}
                        voteCount={voteCountByIdea[v.idea_id] ?? 0}
                        hasVoted={hasVotedByIdea[v.idea_id] ?? false}
                        createdBy={createdByIdea[v.idea_id]}
                        commentCount={commentCountByIdea[v.idea_id] ?? 0}
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
              {versions.length === 0 && !snapshot.isDraggingOver && (
                <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                  <InboxIcon className="size-3.5" />
                  {emptyMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </Droppable>
      {!isViewer && (
        <div className="relative shrink-0">
          <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-background to-transparent" />
          <div className="bg-background px-3 pt-1 pb-2">
            <IdeaDialog
              mode="create"
              workspaceId={workspaceId}
              columnId={column.id}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground hover:bg-transparent hover:text-muted-foreground dark:hover:bg-transparent"
                >
                  <PlusIcon /> Fikir Ekle
                </Button>
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}
