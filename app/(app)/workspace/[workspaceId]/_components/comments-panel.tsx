"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  const [content, setContent] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isLoadingMore, startLoadMoreTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditSaving, startEditTransition] = useTransition();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getComments(ideaId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setNextCursor(res.nextCursor);
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Yorumlar yüklenemedi");
      });
    return () => {
      cancelled = true;
    };
  }, [ideaId]);

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
    <div className="flex flex-col gap-3">
      {showHeading && <h3 className="text-sm font-semibold">Yorumlar</h3>}
      {canContribute && (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <MentionTextarea
            placeholder="Bir yorum yazın... (@ ile üye etiketleyin)"
            value={content}
            onChange={setContent}
            members={members}
            mentionedUserIds={mentionedUserIds}
            onMentionedUserIdsChange={setMentionedUserIds}
          />
          <Button type="submit" size="sm" className="self-end" disabled={isSubmitting || !content.trim()}>
            Yorum Ekle
          </Button>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {!loaded && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {loaded && items.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz yorum yok.</p>
        )}
        {items.map((c) => {
          const isAuthor = c.user_id === currentUserId;
          const canEdit = isAuthor;
          const canDelete = isAuthor || canManageContent;
          const isEditingThis = editingId === c.id;

          return (
            <div key={c.id} className="flex gap-2">
              <Avatar size="sm" className="mt-0.5">
                <AvatarFallback>{getInitials(c.authorFullName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg rounded-tl-sm bg-muted/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">
                    {c.authorFullName ?? "Bilinmeyen kullanıcı"}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[0.7rem] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("tr-TR")}
                      {c.updated_at && " (düzenlendi)"}
                    </span>
                    {!isEditingThis && canEdit && (
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Düzenle"
                      >
                        <PencilIcon className="size-3" />
                      </button>
                    )}
                    {!isEditingThis && canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(c.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Sil"
                      >
                        <Trash2Icon className="size-3" />
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
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
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
