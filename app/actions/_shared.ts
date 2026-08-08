import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

/** created_by/user_id UUID'lerini email'e çözer (profiles tablosu yok, service-role ile auth.users'tan). */
export async function resolveAuthorEmails(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  const admin = createAdminClient();
  const emailById = new Map<string, string>();

  await Promise.all(
    uniqueIds.map(async (uid) => {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data?.user?.email) emailById.set(uid, data.user.email);
    })
  );

  return emailById;
}
