"use server";

import { requireUser } from "./_shared";

/** Kullanıcının "çevrimiçi" sayılması için son görülme zamanını günceller.
 * Client tarafında periyodik olarak (PresenceHeartbeat) çağrılır. */
export async function pingPresence() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("user_presence")
    .upsert({ user_id: user.id, last_seen_at: new Date().toISOString() });

  if (error) throw error;

  return { success: true as const };
}
