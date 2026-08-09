"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type RealtimeWatch = {
  table: string;
  /** Postgres Realtime filtre söz dizimi, örn. "workspace_id=eq.<id>" veya "idea_id=in.(id1,id2)". */
  filter?: string;
};

/**
 * Verilen tablolardaki INSERT/UPDATE/DELETE değişikliklerini dinleyip onChange'i
 * tetikler. RLS zaten hangi satırların bu bağlantıya yayınlanacağını kısıtlıyor.
 *
 * Realtime bağlantısı varsayılan olarak anonim davranır — postgres_changes
 * event'lerinin RLS kontrolünden geçebilmesi için `realtime.setAuth()` ile
 * kullanıcının erişim token'ının açıkça bildirilmesi gerekiyor (@supabase/ssr
 * browser client'ı bunu otomatik yapmıyor).
 */
export function useRealtimeSubscription(
  channelName: string,
  watches: RealtimeWatch[],
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  options?: { enabled?: boolean; debounceMs?: number }
) {
  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? 0;

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const watchKey = watches.map((w) => `${w.table}:${w.filter ?? ""}`).join("|");

  useEffect(() => {
    if (!enabled || watches.length === 0) return;

    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function handle(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
      if (debounceMs > 0) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => onChangeRef.current(payload), debounceMs);
      } else {
        onChangeRef.current(payload);
      }
    }

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase.channel(channelName);
      for (const watch of watches) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: watch.table, filter: watch.filter },
          handle
        );
      }
      channel.subscribe();
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      authSubscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled, watchKey, debounceMs]);
}
