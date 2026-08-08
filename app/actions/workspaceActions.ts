"use server";

import { z } from "zod";
import { requireUser } from "./_shared";

const createWorkspaceSchema = z.object({
  title: z.string().trim().min(1).max(255),
  templateId: z.string().uuid().optional(),
});

export async function createWorkspace(title: string, templateId?: string) {
  const input = createWorkspaceSchema.parse({ title, templateId });
  const { supabase } = await requireUser();

  // workspaces tablosundaki SELECT RLS policy'si workspace_members
  // üyeliğine bağlı olduğundan, workspace + ilk üyelik + (opsiyonel)
  // şablon kolonlarının kopyalanması SECURITY DEFINER bir RPC
  // içinde atomik olarak yapılır (bkz. supabase/migrations/
  // ..._workspace_functions.sql).
  const { data, error } = await supabase.rpc("create_workspace", {
    _title: input.title,
    _template_id: input.templateId,
  });

  if (error) throw error;

  return data;
}

const inviteCodeSchema = z.string().trim().min(1).max(50);

export async function joinWorkspaceByInviteCode(inviteCode: string) {
  const code = inviteCodeSchema.parse(inviteCode);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("join_workspace_by_invite_code", {
    _invite_code: code,
  });

  if (error) {
    if (error.message.includes("invalid_invite_code")) {
      throw new Error("Geçersiz veya süresi dolmuş davet kodu.");
    }
    throw error;
  }

  return data;
}

export async function getMyWorkspaces() {
  const { supabase, user } = await requireUser();

  // workspace_members SELECT RLS politikası, aynı workspace'teki TÜM
  // üyelik kayıtlarını görünür kılar (co-member listesi için kasıtlı),
  // bu yüzden burada yalnızca çağıran kullanıcının kendi üyelik
  // satırları user_id ile explicit filtrelenir.
  const { data, error } = await supabase
    .from("workspace_members")
    .select("joined_at, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (error) throw error;

  return data.map((row) => row.workspace).filter((w): w is NonNullable<typeof w> => w !== null);
}

const workspaceIdSchema = z.string().uuid();

export async function getWorkspaceForUser(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*, kanban_columns(*)")
    .eq("id", id)
    .order("order", { referencedTable: "kanban_columns", ascending: true })
    .single();

  if (error) throw error;

  return data;
}
