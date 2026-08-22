"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SearchIcon, XIcon } from "lucide-react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { moveIdea } from "@/app/actions/ideaActions";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Column } from "./column";
import { CreateColumnDialog } from "./create-column-dialog";
import { CancellationReasonDialog } from "./cancellation-reason-dialog";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import type { Database } from "@/lib/types/database.types";

type ColumnRow = Database["public"]["Tables"]["kanban_columns"]["Row"];
type IdeaVersion = Database["public"]["Tables"]["idea_versions"]["Row"];
type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type Tag = Database["public"]["Tables"]["tags"]["Row"];

const ALL_TAGS = "all";
const ALL_ASSIGNEES = "all";
const UNASSIGNED = "unassigned";

export function Board({
  workspaceId,
  initialColumns,
  versionsByColumn,
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
}: {
  workspaceId: string;
  initialColumns: ColumnRow[];
  versionsByColumn: Record<string, IdeaVersion[]>;
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
}) {
  const router = useRouter();
  const [isMovePending, startMoveTransition] = useTransition();
  const [pendingCancellation, setPendingCancellation] = useState<{
    ideaId: string;
    targetColumnId: string;
    ideaTitle: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState(ALL_TAGS);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL_ASSIGNEES);
  const [hiddenIdeaIds, setHiddenIdeaIds] = useState<Set<string>>(new Set());
  const [columnOverrides, setColumnOverrides] = useState<Record<string, string>>({});
  const [pendingMoveIdeaId, setPendingMoveIdeaId] = useState<string | null>(null);

  // Sunucudan gelen versionsByColumn artık taşımayı yansıtınca override gereksizleşir;
  // bunu setState ile effect içinde temizlemek yerine render sırasında türetiyoruz.
  const activeColumnOverrides = useMemo(() => {
    if (Object.keys(columnOverrides).length === 0) return columnOverrides;
    const entries = Object.entries(columnOverrides).filter(([ideaId, overrideColumnId]) => {
      const actualColumnId = Object.entries(versionsByColumn).find(([, versions]) =>
        versions.some((v) => v.idea_id === ideaId)
      )?.[0];
      return actualColumnId !== overrideColumnId;
    });
    return Object.fromEntries(entries);
  }, [columnOverrides, versionsByColumn]);

  function hideIdea(ideaId: string) {
    setHiddenIdeaIds((prev) => new Set(prev).add(ideaId));
  }

  function showIdea(ideaId: string) {
    setHiddenIdeaIds((prev) => {
      const next = new Set(prev);
      next.delete(ideaId);
      return next;
    });
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" || tagFilter !== ALL_TAGS || assigneeFilter !== ALL_ASSIGNEES;

  const allIdeaIds = useMemo(
    () => Array.from(new Set(Object.values(versionsByColumn).flat().map((v) => v.idea_id))),
    [versionsByColumn]
  );

  useRealtimeSubscription(
    `board-${workspaceId}`,
    [
      { table: "ideas", filter: `workspace_id=eq.${workspaceId}` },
      { table: "kanban_columns", filter: `workspace_id=eq.${workspaceId}` },
      { table: "tags", filter: `workspace_id=eq.${workspaceId}` },
      ...(allIdeaIds.length > 0
        ? [{ table: "idea_votes", filter: `idea_id=in.(${allIdeaIds.join(",")})` }]
        : []),
    ],
    () => router.refresh(),
    { debounceMs: 400 }
  );

  const effectiveVersionsByColumn = useMemo(() => {
    if (Object.keys(activeColumnOverrides).length === 0) return versionsByColumn;
    const result: Record<string, IdeaVersion[]> = {};
    for (const [columnId, versions] of Object.entries(versionsByColumn)) {
      for (const version of versions) {
        const effectiveColumnId = activeColumnOverrides[version.idea_id] ?? columnId;
        (result[effectiveColumnId] ??= []).push(version);
      }
    }
    return result;
  }, [versionsByColumn, activeColumnOverrides]);

  const filteredVersionsByColumn = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result: Record<string, IdeaVersion[]> = {};
    for (const [columnId, versions] of Object.entries(effectiveVersionsByColumn)) {
      result[columnId] = versions.filter((v) => {
        if (hiddenIdeaIds.has(v.idea_id)) return false;
        if (
          query &&
          !v.title.toLowerCase().includes(query) &&
          !(v.content ?? "").toLowerCase().includes(query)
        ) {
          return false;
        }
        if (tagFilter !== ALL_TAGS) {
          const ideaTagIds = (tagsByIdea[v.idea_id] ?? []).map((t) => t.id);
          if (!ideaTagIds.includes(tagFilter)) return false;
        }
        if (assigneeFilter !== ALL_ASSIGNEES) {
          const assigneeId = assigneeByIdea[v.idea_id] ?? null;
          if (assigneeFilter === UNASSIGNED) {
            if (assigneeId !== null) return false;
          } else if (assigneeId !== assigneeFilter) {
            return false;
          }
        }
        return true;
      });
    }
    return result;
  }, [effectiveVersionsByColumn, tagsByIdea, assigneeByIdea, searchQuery, tagFilter, assigneeFilter, hiddenIdeaIds]);

  function moveCard(ideaId: string, targetColumnId: string, cancellationReason?: string) {
    setColumnOverrides((prev) => ({ ...prev, [ideaId]: targetColumnId }));
    setPendingMoveIdeaId(ideaId);
    startMoveTransition(async () => {
      try {
        await moveIdea(ideaId, targetColumnId, cancellationReason);
        toast.success("Fikir taşındı");
        router.refresh();
      } catch (err) {
        setColumnOverrides((prev) => {
          const next = { ...prev };
          delete next[ideaId];
          return next;
        });
        toast.error(err instanceof Error ? err.message : "Fikir taşınamadı");
      } finally {
        setPendingMoveIdeaId(null);
      }
    });
  }

  function onDragEnd(result: DropResult) {
    if (isViewer) return;
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
      <div className="grid grid-cols-2 gap-2 border-b bg-muted/15 px-3 py-3 sm:flex sm:flex-wrap sm:items-center sm:px-4 sm:py-2.5">
        <div className="relative col-span-2 w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Fikir ara..."
            className="h-8 pl-8"
          />
        </div>
        <Select value={tagFilter} onValueChange={(v) => v && setTagFilter(v)}>
          <SelectTrigger size="sm" className="w-full sm:w-auto" aria-label="Etikete göre filtrele">
            <SelectValue>
              {() => (tagFilter === ALL_TAGS ? "Tüm etiketler" : tags.find((t) => t.id === tagFilter)?.name)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TAGS}>Tüm etiketler</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={(v) => v && setAssigneeFilter(v)}>
          <SelectTrigger size="sm" className="w-full sm:w-auto" aria-label="Atanan kişiye göre filtrele">
            <SelectValue>
              {() =>
                assigneeFilter === ALL_ASSIGNEES
                  ? "Tüm atananlar"
                  : assigneeFilter === UNASSIGNED
                    ? "Atanmamış"
                    : members.find((m) => m.user_id === assigneeFilter)?.fullName
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ASSIGNEES}>Tüm atananlar</SelectItem>
            <SelectItem value={UNASSIGNED}>Atanmamış</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="col-span-2 justify-self-start sm:col-auto"
            onClick={() => {
              setSearchQuery("");
              setTagFilter(ALL_TAGS);
              setAssigneeFilter(ALL_ASSIGNEES);
            }}
          >
            <XIcon /> Temizle
          </Button>
        )}
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="scrollbar-subtle flex flex-1 items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain px-3 sm:px-4">
          {initialColumns.map((col) => (
            <Column
              key={col.id}
              workspaceId={workspaceId}
              column={col}
              versions={filteredVersionsByColumn[col.id] ?? []}
              emptyMessage={hasActiveFilters ? "Bu filtrelerle eşleşen fikir yok" : "Bu kolonda fikir yok"}
              assigneeByIdea={assigneeByIdea}
              tagsByIdea={tagsByIdea}
              voteCountByIdea={voteCountByIdea}
              hasVotedByIdea={hasVotedByIdea}
              createdByIdea={createdByIdea}
              commentCountByIdea={commentCountByIdea}
              currentUserId={currentUserId}
              members={members}
              tags={tags}
              canManageContent={canManageContent}
              isViewer={isViewer}
              canContribute={canContribute}
              autoOpenIdeaId={autoOpenIdeaId}
              pendingMoveIdeaId={pendingMoveIdeaId}
              hideIdea={hideIdea}
              showIdea={showIdea}
            />
          ))}
          {canManageContent && (
            <CreateColumnDialog workspaceId={workspaceId} nextOrder={initialColumns.length} />
          )}
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
