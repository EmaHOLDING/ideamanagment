"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { addComment, getComments } from "@/app/actions/commentActions";
import { MentionTextarea } from "./mention-textarea";
import { getInitials } from "@/lib/user-display";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";

type CommentWithAuthor = Awaited<ReturnType<typeof getComments>>["items"][number];
type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];

export function CommentsPanel({
  ideaId,
  members,
  showHeading = true,
}: {
  ideaId: string;
  members: Member[];
  showHeading?: boolean;
}) {
  const [items, setItems] = useState<CommentWithAuthor[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

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

  return (
    <div className="flex flex-col gap-3">
      {showHeading && <h3 className="text-sm font-semibold">Yorumlar</h3>}
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

      <div className="flex flex-col gap-3">
        {!loaded && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
        {loaded && items.length === 0 && (
          <p className="text-sm text-muted-foreground">Henüz yorum yok.</p>
        )}
        {items.map((c) => (
          <div key={c.id} className="flex gap-2">
            <Avatar size="sm" className="mt-0.5">
              <AvatarFallback>{getInitials(c.authorFullName)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg rounded-tl-sm bg-muted/50 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">
                  {c.authorFullName ?? "Bilinmeyen kullanıcı"}
                </span>
                <span className="shrink-0 text-[0.7rem] text-muted-foreground">
                  {new Date(c.created_at).toLocaleString("tr-TR")}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
            </div>
          </div>
        ))}
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
    </div>
  );
}
