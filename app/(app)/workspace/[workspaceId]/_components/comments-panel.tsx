"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { LoaderCircleIcon, MessageSquareIcon, PencilIcon, SendIcon, Trash2Icon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ContentLoading, ContentState } from "@/components/ui/content-state";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addComment,
  getComments,
  softDeleteComment,
  undoDeleteComment,
  updateComment,
} from "@/app/actions/commentActions";
import { MentionTextarea } from "./mention-textarea";
import { getInitials } from "@/lib/user-display";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";

type CommentWithAuthor = Awaited<ReturnType<typeof getComments>>["items"][number];
type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];

export function CommentsPanel({
  ideaId,
  members,
  currentUserId,
  canManageContent,
  canContribute,
  showHeading = true,
}: {
  ideaId: string;
  members: Member[];
  currentUserId: string;
  canManageContent: boolean;
  canContribute: boolean;
  showHeading?: boolean;
}) {
  const [items, setItems] = useState<CommentWithAuthor[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [content, setContent] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isLoadingMore, startLoadMoreTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditSaving, startEditTransition] = useTransition();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoaded(false);
    setLoadError(false);
    try {
      const res = await getComments(ideaId);
      setItems(res.items);
      setNextCursor(res.nextCursor);
      setLoaded(true);
    } catch {
      setLoadError(true);
    }
  }, [ideaId]);

  useEffect(() => {
    let cancelled = false;
    getComments(ideaId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setNextCursor(res.nextCursor);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ideaId]);

  useRealtimeSubscription(
    `comments-${ideaId}`,
    [{ table: "comments", filter: `idea_id=eq.${ideaId}` }],
    () => {
      getComments(ideaId)
        .then((res) => {
          setItems(res.items);
          setNextCursor(res.nextCursor);
        })
        .catch(() => {});
    }
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    startSubmitTransition(async () => {
      try {
        await addComment(ideaId, trimmed, mentionedUserIds);
        setContent("");
        setMentionedUserIds([]);
        const res = await getComments(ideaId);
        setItems(res.items);
        setNextCursor(res.nextCursor);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Yorum eklenemedi");
      }
    });
  }

  function onLoadMore() {
    if (!nextCursor) return;
    startLoadMoreTransition(async () => {
      try {
        const res = await getComments(ideaId, nextCursor);
        setItems((prev) => [...prev, ...res.items]);
        setNextCursor(res.nextCursor);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Yorumlar yüklenemedi");
      }
    });
  }

  function startEdit(c: CommentWithAuthor) {
    setEditingId(c.id);
    setEditContent(c.content);
  }

  function onSaveEdit(commentId: string) {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    startEditTransition(async () => {
      try {
        await updateComment(commentId, trimmed);
        setItems((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, content: trimmed, updated_at: new Date().toISOString() }
              : c
          )
        );
        setEditingId(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Yorum güncellenemedi");
      }
    });
  }

  function onConfirmDelete() {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    setDeleteTargetId(null);

    const index = items.findIndex((c) => c.id === targetId);
    if (index === -1) return;
    const removed = items[index];
    setItems((prev) => prev.filter((c) => c.id !== targetId));

    function reinsert() {
      setItems((prev) => {
        const next = prev.slice();
        next.splice(index, 0, removed);
        return next;
      });
    }

    function onUndo() {
      reinsert();
      undoDeleteComment(targetId).catch((err) => {
        setItems((prev) => prev.filter((c) => c.id !== targetId));
        toast.error(err instanceof Error ? err.message : "Yorum geri yüklenemedi");
      });
    }

    toast("Yorum silindi.", {
      position: "bottom-center",
      duration: 30000,
      action: { label: "Geri Al", onClick: onUndo },
    });

    softDeleteComment(targetId).catch((err) => {
      reinsert();
      toast.error(err instanceof Error ? err.message : "Yorum silinemedi");
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {showHeading && <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquareIcon className="size-4 text-muted-foreground" /> Yorumlar {loaded && <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium tabular-nums text-muted-foreground">{items.length}</span>}</h3>}
      {canContribute && (
        <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3">
          <MentionTextarea
            placeholder="Bir yorum yazın... (@ ile üye etiketleyin)"
            value={content}
            onChange={setContent}
            members={members}
            mentionedUserIds={mentionedUserIds}
            onMentionedUserIdsChange={setMentionedUserIds}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.7rem] text-muted-foreground">Ekip arkadaşınızı <strong className="font-medium text-foreground">@</strong> ile etiketleyebilirsiniz.</span>
            <Button type="submit" size="sm" className="shrink-0" disabled={isSubmitting || !content.trim()} aria-busy={isSubmitting}>
              {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />} {isSubmitting ? "Ekleniyor..." : "Gönder"}
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3 sm:gap-3.5">
        {!loaded && !loadError && <ContentLoading rows={2} />}
        {loadError && (
          <ContentState tone="error" title="Yorumlar yüklenemedi" description="Bağlantınızı kontrol edip yeniden deneyin." onRetry={() => void loadComments()} />
        )}
        {loaded && items.length === 0 && (
          <ContentState title="Henüz yorum yok" description="İlk yorumu ekleyerek konuşmayı başlatın." />
        )}
        {items.map((c) => {
          const isAuthor = c.user_id === currentUserId;
          const canEdit = isAuthor;
          const canDelete = isAuthor || canManageContent;
          const isEditingThis = editingId === c.id;

          return (
            <div
              key={c.id}
              className="group/comment flex min-w-0 gap-2.5 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-border sm:gap-3"
            >
              <Avatar size="sm" className="mt-0.5 shrink-0">
                <AvatarFallback>{getInitials(c.authorFullName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-x-2 gap-y-0.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">
                      {c.authorFullName ?? "Bilinmeyen kullanıcı"}
                    </span>
                    <span className="text-[0.7rem] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("tr-TR")}
                      {c.updated_at && <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5">düzenlendi</span>}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {!isEditingThis && canEdit && (
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Düzenle"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                    )}
                    {!isEditingThis && canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(c.id)}
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Sil"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {isEditingThis ? (
                  <div className="flex flex-col gap-1.5">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingId(null)}
                      >
                        Vazgeç
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        disabled={isEditSaving || !editContent.trim()}
                        onClick={() => onSaveEdit(c.id)}
                      >
                        Kaydet
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="min-w-0 text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{c.content}</p>
                )}
              </div>
            </div>
          );
        })}
        {nextCursor && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoadingMore}
            onClick={onLoadMore}
          >
            Daha Fazla Yükle
          </Button>
        )}
      </div>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yorumu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu yorumu silmek istediğinize emin misiniz? Silme sonrası kısa bir süre geri
              alabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirmDelete}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
