import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * service_role key ile çalışan, RLS'i bypass eden client.
 * Yalnızca server-side (server actions) içinde, sistem işlemleri için
 * kullanılır (örn. bildirim üretimi, Bölüm 6.D/7.B). Asla client
 * bundle'ına dahil edilmemeli.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
