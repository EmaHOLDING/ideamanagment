"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { requireUser, resolveAuthorProfiles, getDisplayName } from "./_shared";
import { getResendClient } from "@/lib/resend";
import { workspaceInviteEmailHtml } from "@/lib/email-templates";

const createWorkspaceSchema = z.object({
  title: z.string().trim().min(1).max(255),
  templateId: z.string().uuid().optional(),
});

export async function createWorkspace(title: string, templateId?: string) {
  const input = createWorkspaceSchema.parse({ title, templateId });
  const { supabase } = await requireUser();

  // workspaces tablosundaki SELECT RLS policy'si workspace_members
  // üyeliğine bağlı olduğundan, workspace + ilk üyelik (OWNER) + (opsiyonel)
  // şablon kolonlarının kopyalanması SECURITY DEFINER bir RPC
  // içinde atomik olarak yapılır (bkz. supabase/migrations/
  // ..._workspace_functions.sql, ..._workspace_roles.sql).
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
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase.rpc("join_workspace_by_invite_code", {
    _invite_code: code,
  });

  if (error) {
    if (error.message.includes("invalid_invite_code")) {
      throw new Error("Geçersiz veya süresi dolmuş davet kodu.");
    }
    throw error;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("status")
    .eq("workspace_id", data.id)
    .eq("user_id", user.id)
    .single();

  if (membershipError) throw membershipError;

  return { ...data, status: membership.status };
}

export async function getMyWorkspaces() {
  const { supabase, user } = await requireUser();

  // workspace_members SELECT RLS politikası, aynı workspace'teki TÜM
  // üyelik kayıtlarını görünür kılar (co-member listesi için kasıtlı),
  // bu yüzden burada yalnızca çağıran kullanıcının kendi üyelik
  // satırları user_id ile explicit filtrelenir.
  const { data, error } = await supabase
    .from("workspace_members")
    .select("joined_at, role, status, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (error) throw error;

  return data
    .filter((row) => row.workspace !== null)
    .map((row) => ({ ...row.workspace!, role: row.role, status: row.status }));
}

const workspaceIdSchema = z.string().uuid();

export async function getWorkspaceForUser(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*, kanban_columns(*), workspace_members!inner(role)")
    .eq("id", id)
    .eq("workspace_members.user_id", user.id)
    .order("order", { referencedTable: "kanban_columns", ascending: true })
    .single();

  if (error) throw error;

  const { workspace_members, ...workspace } = data;
  const role = workspace_members[0]?.role ?? "MEMBER";

  return { ...workspace, role, isOwner: role === "OWNER" };
}

export async function getWorkspaceMembers(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", id)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  const profileById = await resolveAuthorProfiles(data.map((m) => m.user_id));

  return data.map((m) => ({
    ...m,
    email: profileById.get(m.user_id)?.email ?? null,
    fullName: profileById.get(m.user_id)?.fullName ?? "Bilinmeyen kullanıcı",
  }));
}

const removeMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function removeMember(workspaceId: string, userId: string) {
  const input = removeMemberSchema.parse({ workspaceId, userId });
  const { supabase } = await requireUser();

  const { data: target, error: targetError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId)
    .single();

  if (targetError) throw targetError;

  if (target.role === "OWNER") {
    throw new Error("Workspace sahibi çıkarılamaz. Önce sahipliği başka bir üyeye devretmeli.");
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId);

  if (error) throw error;

  return { success: true };
}

const assignableRoleSchema = z.enum(["MEMBER", "ADMIN", "VIEWER"]);

const updateMemberRoleSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  role: assignableRoleSchema,
});

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: "MEMBER" | "ADMIN" | "VIEWER"
) {
  const input = updateMemberRoleSchema.parse({ workspaceId, userId, role });
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role: input.role })
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Bu işlemi yapma yetkiniz yok.");
  }

  return data;
}

const setDefaultInviteRoleSchema = z.object({
  workspaceId: z.string().uuid(),
  role: assignableRoleSchema,
});

export async function setDefaultInviteRole(
  workspaceId: string,
  role: "MEMBER" | "ADMIN" | "VIEWER"
) {
  const input = setDefaultInviteRoleSchema.parse({ workspaceId, role });
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("workspaces")
    .update({ default_invite_role: input.role })
    .eq("id", input.workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Bu işlemi yapma yetkiniz yok.");
  }

  return data;
}

export async function transferOwnership(workspaceId: string, newOwnerUserId: string) {
  const input = removeMemberSchema.parse({ workspaceId, userId: newOwnerUserId });
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("transfer_workspace_ownership", {
    _workspace_id: input.workspaceId,
    _new_owner_user_id: input.userId,
  });

  if (error) {
    if (error.message.includes("only the current owner")) {
      throw new Error("Sahipliği yalnızca mevcut workspace sahibi devredebilir.");
    }
    if (error.message.includes("not a member")) {
      throw new Error("Seçilen kullanıcı bu workspace'in üyesi değil.");
    }
    throw error;
  }

  return { success: true };
}

export async function leaveWorkspace(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase, user } = await requireUser();

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .single();

  if (membershipError) throw membershipError;

  if (membership.role === "OWNER") {
    throw new Error(
      "Workspace sahibi olarak ayrılmadan önce sahipliği başka bir üyeye devretmelisiniz."
    );
  }

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  return { success: true };
}

export async function regenerateInviteCode(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const newCode = randomBytes(6).toString("hex").slice(0, 10);

  const { data, error } = await supabase
    .from("workspaces")
    .update({ invite_code: newCode })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

const updateWorkspaceTitleSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
});

export async function updateWorkspaceTitle(workspaceId: string, title: string) {
  const input = updateWorkspaceTitleSchema.parse({ workspaceId, title });
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("workspaces")
    .update({ title: input.title })
    .eq("id", input.workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Bu işlemi yapma yetkiniz yok.");
  }

  return data;
}

export async function acceptWorkspaceInvite(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("accept_workspace_invite", {
    _workspace_id: id,
  });

  if (error) {
    if (error.message.includes("no_pending_invite")) {
      throw new Error("Bekleyen bir davetiniz bulunamadı.");
    }
    throw error;
  }

  return { success: true };
}

export async function rejectWorkspaceInvite(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  return { success: true };
}

export async function getWorkspaceMemberCount(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("get_workspace_member_count", {
    _workspace_id: id,
  });

  if (error) throw error;

  return data;
}

const sendWorkspaceInviteEmailSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().trim().email(),
});

export async function sendWorkspaceInviteEmail(workspaceId: string, email: string) {
  const input = sendWorkspaceInviteEmailSchema.parse({ workspaceId, email });
  const { supabase, user } = await requireUser();

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new Error("Bu işlemi yapma yetkiniz yok.");
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("title, invite_code")
    .eq("id", input.workspaceId)
    .single();

  if (workspaceError || !workspace) throw new Error("Workspace bulunamadı.");

  const resend = getResendClient();
  if (!resend) {
    throw new Error("E-posta servisi yapılandırılmamış.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${workspace.invite_code}`;
  const actorName = getDisplayName(user);

  const { error: sendError } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: input.email,
    subject: `${actorName} sizi '${workspace.title}' workspace'ine davet etti`,
    html: workspaceInviteEmailHtml({ actorName, workspaceTitle: workspace.title, inviteUrl }),
  });

  if (sendError) {
    throw new Error("E-posta gönderilemedi.");
  }

  return { success: true };
}

export async function deleteWorkspaceAction(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const { error } = await supabase.from("workspaces").delete().eq("id", id);

  if (error) throw error;

  return { success: true };
}
