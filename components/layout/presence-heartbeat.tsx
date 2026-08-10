"use client";

import { useEffect } from "react";
import { pingPresence } from "@/app/actions/presenceActions";

const HEARTBEAT_INTERVAL_MS = 45_000;

/** Görünmez bileşen — sekme görünür/odaklıyken periyodik olarak
 * pingPresence() çağırır, sunucu tarafında "çevrimiçi" kararı için
 * kullanılır. Sekme arka plana geçince heartbeat durur. */
export function PresenceHeartbeat() {
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function ping() {
      pingPresence().catch(() => {});
    }

    function start() {
      ping();
      intervalId = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    }

    function stop() {
      clearInterval(intervalId);
      intervalId = undefined;
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") {
      start();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
