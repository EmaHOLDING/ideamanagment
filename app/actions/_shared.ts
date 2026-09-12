import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/user-display";

export { getDisplayName };

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Bu işlem için giriş yapmış olmanız gerekiyor.");
  }

  return { supabase, user };
}

function isTransientAuthError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message ?? "";
  return code === "PGRST303" || message.includes("JWT issued at future");
}

/** Google OAuth'tan hemen sonra mint edilen JWT'nin "iat" (issued-at)
 * değeri, PostgREST'in sunucu saatine göre "gelecekte" kalabiliyor — bu da
 * girişten hemen sonraki ilk sorguda "JWT issued at future" (PGRST303)
 * hatasına yol açıyor. Üretimde bu birkaç milisaniyelik ağ/saat toleransı
 * meselesi, ama yerel geliştirmede Docker Desktop'ın VM saati (özellikle
 * uyku/yeniden başlatma sonrası) saniyeler mertebesinde kayabiliyor — tek
 * seferlik sabit bir bekleme bunu kapatamayabiliyor ve kullanıcı elle
 * yenilemek zorunda kalıyordu. Bu yüzden artan gecikmeyle birkaç kez
 * deneniyor; gerçek yetki hataları (giriş yapılmamış vb.) olduğu gibi
 * fırlatılmaya devam ediyor. */
const RETRY_DELAYS_MS = [400, 1000, 2000];

export async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransientAuthError(err) || attempt >= RETRY_DELAYS_MS.length) throw err;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

export type Cursor = { createdAt: string; id: string };

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

/** Cursor'ın içeriği base64'ten çözülüp doğrudan PostgREST'in `or=(...)`
 * filtre ifadesine string olarak gömülüyor (bkz. getComments /
 * getActivityLog / getNotifications). Cursor client'tan geldiği için
 * doğrulanmadan kullanılırsa, `,` `(` `)` gibi karakterlerle filtrenin
 * sözdiziminden çıkılabilir — RLS ve idea_id/user_id eşitlikleri sorguyu
 * hâlâ sınırlasa da bu bir injection yüzeyi. Bu yüzden şekil burada
 * katı biçimde doğrulanıyor: id gerçek bir UUID, createdAt ise yalnızca
 * ISO-8601 zaman damgasında geçen karakterlerden oluşuyor
 * (örn. "2026-09-12T13:12:56.983454+00:00"). Uymayan cursor, hata
 * fırlatmak yerine "cursor yok" sayılıp ilk sayfaya düşüyor. */
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,9})?([+-]\d{2}:?\d{2}|Z)?$/;

const cursorSchema = z.object({
  createdAt: z.string().regex(ISO_TIMESTAMP),
  id: z.string().uuid(),
});

export function decodeCursor(cursor: string | undefined | null): Cursor | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
    const result = cursorSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** created_by/user_id UUID'lerini e-posta + görünen isme çözer.
 *
 * Eskiden her kullanıcı için ayrı bir `admin.auth.admin.getUserById()`
 * HTTP çağrısı yapılıyordu (cache'siz, beş ayrı çağrı noktasından). Artık
 * `profiles` tablosundan tek sorguyla çözülüyor — bu tablo auth.users'a
 * trigger'la bağlı (bkz. 20260912120000_profiles.sql) ve RLS'i "yalnızca
 * kendin + ortak workspace'teki kişiler" olduğu için service_role da
 * gerekmiyor. */
export async function resolveAuthorProfiles(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  const profileById = new Map<string, { email: string | null; fullName: string }>();
  if (uniqueIds.length === 0) return profileById;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", uniqueIds);

  if (error) throw error;

  for (const row of data ?? []) {
    profileById.set(row.id, {
      email: row.email,
      fullName: row.full_name ?? row.email ?? "Bir kullanıcı",
    });
  }

  return profileById;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Aktivite akışı satırı ekler. Çağıran kendi eylemini kendi adına logladığı
 * için (actor_id = auth.uid()) admin client gerekmez, RLS izin verir. */
export async function logActivity(
  supabase: SupabaseServerClient,
  params: {
    workspaceId: string;
    actorId: string;
    ideaId?: string | null;
    type: string;
    message: string;
  }
) {
  const { error } = await supabase.from("activity_log").insert({
    workspace_id: params.workspaceId,
    actor_id: params.actorId,
    idea_id: params.ideaId ?? null,
    type: params.type,
    message: params.message,
  });
  if (error) throw error;
}
