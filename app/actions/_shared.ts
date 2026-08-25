import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export function decodeCursor(cursor: string | undefined | null): Cursor | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8")) as Cursor;
  } catch {
    return null;
  }
}

/** created_by/user_id UUID'lerini email + görünen isme çözer (profiles
 * tablosu yok, service-role ile auth.users'tan). */
export async function resolveAuthorProfiles(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  const admin = createAdminClient();
  const profileById = new Map<string, { email: string | null; fullName: string }>();

  await Promise.all(
    uniqueIds.map(async (uid) => {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data?.user) {
        profileById.set(uid, {
          email: data.user.email ?? null,
          fullName: getDisplayName(data.user),
        });
      }
    })
  );

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
