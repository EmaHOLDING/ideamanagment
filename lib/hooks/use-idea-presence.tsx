"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PresenceAction = "editing" | "dragging";

type PresenceEntry = {
  userId: string;
  fullName: string;
  action: PresenceAction;
};

type PresenceMeta = {
  userId: string;
  fullName: string;
  editingIdeaId: string | null;
  draggingIdeaId: string | null;
};

type IdeaPresenceContextValue = {
  othersByIdea: Record<string, PresenceEntry[]>;
  setEditing: (ideaId: string | null) => void;
  setDragging: (ideaId: string | null) => void;
};

const IdeaPresenceContext = createContext<IdeaPresenceContextValue | null>(null);

/** Workspace başına tek bir Realtime Presence kanalı açar; kimin hangi
 * fikri düzenlediğini/taşıdığını üyeler arasında anlık paylaşır. DB'ye
 * hiçbir şey yazmaz — sadece bağlantı süresince bellekte tutulan, sekme
 * kapanınca kendiliğinden düşen ("leave") bir sinyal. */
export function IdeaPresenceProvider({
  workspaceId,
  currentUserId,
  currentUserName,
  children,
}: {
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  children: React.ReactNode;
}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stateRef = useRef<{ editingIdeaId: string | null; draggingIdeaId: string | null }>({
    editingIdeaId: null,
    draggingIdeaId: null,
  });
  const [othersByIdea, setOthersByIdea] = useState<Record<string, PresenceEntry[]>>({});

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    function syncFromPresenceState() {
      if (!channel) return;
      const state = channel.presenceState() as Record<string, PresenceMeta[]>;
      const next: Record<string, PresenceEntry[]> = {};
      for (const presences of Object.values(state)) {
        for (const meta of presences) {
          if (meta.userId === currentUserId) continue;
          if (meta.editingIdeaId) {
            (next[meta.editingIdeaId] ??= []).push({
              userId: meta.userId,
              fullName: meta.fullName,
              action: "editing",
            });
          }
          if (meta.draggingIdeaId) {
            (next[meta.draggingIdeaId] ??= []).push({
              userId: meta.userId,
              fullName: meta.fullName,
              action: "dragging",
            });
          }
        }
      }
      setOthersByIdea(next);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      channel = supabase.channel(`idea-presence-${workspaceId}`, {
        config: { presence: { key: currentUserId } },
      });
      channel.on("presence", { event: "sync" }, syncFromPresenceState).subscribe((status) => {
        if (status === "SUBSCRIBED" && channel) {
          channel.track({
            userId: currentUserId,
            fullName: currentUserName,
            editingIdeaId: stateRef.current.editingIdeaId,
            draggingIdeaId: stateRef.current.draggingIdeaId,
          } satisfies PresenceMeta);
        }
      });
      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [workspaceId, currentUserId, currentUserName]);

  const track = useCallback(
    (partial: Partial<{ editingIdeaId: string | null; draggingIdeaId: string | null }>) => {
      stateRef.current = { ...stateRef.current, ...partial };
      channelRef.current?.track({
        userId: currentUserId,
        fullName: currentUserName,
        editingIdeaId: stateRef.current.editingIdeaId,
        draggingIdeaId: stateRef.current.draggingIdeaId,
      } satisfies PresenceMeta);
    },
    [currentUserId, currentUserName]
  );

  const setEditing = useCallback((ideaId: string | null) => track({ editingIdeaId: ideaId }), [track]);
  const setDragging = useCallback((ideaId: string | null) => track({ draggingIdeaId: ideaId }), [track]);

  const value = useMemo(
    () => ({ othersByIdea, setEditing, setDragging }),
    [othersByIdea, setEditing, setDragging]
  );

  return <IdeaPresenceContext.Provider value={value}>{children}</IdeaPresenceContext.Provider>;
}

/** Belirtilen fikri şu an düzenleyen/taşıyan (kendisi hariç) diğer kullanıcılar. */
export function useIdeaPresence(ideaId: string): PresenceEntry[] {
  const ctx = useContext(IdeaPresenceContext);
  if (!ctx) return [];
  return ctx.othersByIdea[ideaId] ?? [];
}

/** Tüm fikirlerin presence haritasının kendisi — döngü içinde her fikir için
 * ayrı ayrı hook çağırmak yerine (rules-of-hooks ihlali) tek çağrıyla alınıp
 * düz obje erişimiyle (ör. map[ideaId]) kullanılmak üzere. */
export function useIdeaPresenceMap(): Record<string, PresenceEntry[]> {
  const ctx = useContext(IdeaPresenceContext);
  return ctx?.othersByIdea ?? {};
}

export function useIdeaPresenceActions() {
  const ctx = useContext(IdeaPresenceContext);
  return {
    setEditing: ctx?.setEditing ?? (() => {}),
    setDragging: ctx?.setDragging ?? (() => {}),
  };
}
