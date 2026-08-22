"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { requireUser, resolveAuthorProfiles, getDisplayName, logActivity, withAuthRetry } from "./_shared";
import { notifyEvent } from "./_notifications";
import { getResendClient } from "@/lib/resend";
import { workspaceInviteEmailHtml, workspaceJoinedEmailHtml } from "@/lib/email-templates";
import { enforceRateLimit } from "@/lib/rate-limit";

const createWorkspaceSchema = z.object({
  title: z.string().trim().min(1).max(255),
  templateId: z.string().uuid().optional(),
  description: z.string().trim().max(250).optional(),
});

export async function createWorkspace(title: string, templateId?: string, description?: string) {
  const input = createWorkspaceSchema.parse({ title, templateId, description });
  const { supabase, user } = await requireUser();
  await enforceRateLimit(supabase, `createWorkspace:${user.id}`, 10, 3600);

  // workspaces tablosundaki SELECT RLS policy'si workspace_members
  // üyeliğine bağlı olduğundan, workspace + ilk üyelik (OWNER) + (opsiyonel)
  // şablon kolonlarının kopyalanması SECURITY DEFINER bir RPC
  // içinde atomik olarak yapılır (bkz. supabase/migrations/
  // ..._workspace_functions.sql, ..._workspace_roles.sql).
  const { data, error } = await supabase.rpc("create_workspace", {
    _title: input.title,
    _template_id: input.templateId,
    _description: input.description || undefined,
  });

  if (error) throw error;

  return data;
}

const inviteCodeSchema = z.string().trim().min(1).max(50);

export async function joinWorkspaceByInviteCode(inviteCode: string) {
  const code = inviteCodeSchema.parse(inviteCode);
  const { supabase, user } = await requireUser();
  // Davet kodu tahmin etmeye (brute-force) karşı savunma derinliği —
  // kod başına ~40 bit entropi olsa da, bu kontrol otomatik deneme
  // döngülerini kullanıcı bazında erken durduruyor.
  await enforceRateLimit(supabase, `joinWorkspaceByInviteCode:${user.id}`, 20, 3600);

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
  const data = await withAuthRetry(async () => {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("joined_at, role, status, workspace:workspaces(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });
    if (error) throw error;
    return data;
  });

  return data
    .filter((row) => row.workspace !== null)
    .map((row) => ({ ...row.workspace!, role: row.role, status: row.status }));
}

const workspaceIdSchema = z.string().uuid();

export async function getWorkspaceForUser(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase, user } = await requireUser();

  const data = await withAuthRetry(async () => {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*, kanban_columns(*), workspace_members!inner(role)")
      .eq("id", id)
      .eq("workspace_members.user_id", user.id)
      .order("order", { referencedTable: "kanban_columns", ascending: true })
      .single();
    if (error) throw error;
    return data;
  });

  const { workspace_members, ...workspace } = data;
  const role = workspace_members[0]?.role ?? "MEMBER";

  return { ...workspace, role, isOwner: role === "OWNER" };
}

export async function getWorkspaceMembers(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const data = await withAuthRetry(async () => {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", id)
      .eq("status", "ACTIVE")
      .order("joined_at", { ascending: true });
    if (error) throw error;
    return data;
  });

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

  const { error, count } = await supabase
    .from("workspace_members")
    .delete({ count: "exact" })
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId);

  if (error) throw error;
  if (!count) throw new Error("Bu işlemi yapma yetkiniz yok.");

  // "Geri Al" toast'ının undoRemoveMember çağırabilmesi için, çıkarılan
  // üyenin rolü client'a geri döndürülüyor (workspace_members zaten
  // silindiği için buradan sonra tekrar okunamaz).
  return { success: true, role: target.role as "MEMBER" | "ADMIN" | "VIEWER" };
}

const assignableRoleSchema = z.enum(["MEMBER", "ADMIN", "VIEWER"]);

const undoRemoveMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  role: assignableRoleSchema,
});

export async function undoRemoveMember(
  workspaceId: string,
  userId: string,
  role: "MEMBER" | "ADMIN" | "VIEWER"
) {
  const input = undoRemoveMemberSchema.parse({ workspaceId, userId, role });
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("undo_remove_member", {
    _workspace_id: input.workspaceId,
    _user_id: input.userId,
    _role: input.role,
  });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu üyeyi geri ekleme yetkiniz yok.");
    }
    throw error;
  }

  return { success: true };
}

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

const updateWorkspaceDescriptionSchema = z.object({
  workspaceId: z.string().uuid(),
  description: z.string().trim().max(250),
});

export async function updateWorkspaceDescription(workspaceId: string, description: string) {
  const input = updateWorkspaceDescriptionSchema.parse({ workspaceId, description });
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("workspaces")
    .update({ description: input.description || null })
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
  const { supabase, user } = await requireUser();

  const { error } = await supabase.rpc("accept_workspace_invite", {
    _workspace_id: id,
  });

  if (error) {
    if (error.message.includes("no_pending_invite")) {
      throw new Error("Bekleyen bir davetiniz bulunamadı.");
    }
    throw error;
  }

  // Katılan kişi hariç, workspace'teki mevcut aktif üyelere bildirim +
  // aktivite akışı kaydı düşülür (e-posta tercihi varsayılan kapalı —
  // registry'deki workspace_joined.defaultEmailEnabled).
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("title")
    .eq("id", id)
    .single();

  const joinerName = getDisplayName(user);
  const workspaceTitle = workspace?.title ?? "";
  const message = `${joinerName}, '${workspaceTitle}' workspace'ine katıldı.`;

  const { data: existingMembers } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", id)
    .eq("status", "ACTIVE")
    .neq("user_id", user.id);

  if (existingMembers && existingMembers.length > 0) {
    await notifyEvent({
      type: "workspace_joined",
      recipientUserIds: existingMembers.map((m) => m.user_id),
      actorId: user.id,
      workspaceId: id,
      ideaId: null,
      message,
      email: {
        subject: `${joinerName} workspace'inize katıldı`,
        html: workspaceJoinedEmailHtml({ actorName: joinerName, workspaceTitle, workspaceId: id }),
      },
    });
  }

  await logActivity(supabase, {
    workspaceId: id,
    actorId: user.id,
    type: "member_joined",
    message,
  });

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

  return withAuthRetry(async () => {
    const { data, error } = await supabase.rpc("get_workspace_member_count", {
      _workspace_id: id,
    });
    if (error) throw error;
    return data;
  });
}

const sendWorkspaceInviteEmailSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().trim().email(),
});

export async function sendWorkspaceInviteEmail(workspaceId: string, email: string) {
  const input = sendWorkspaceInviteEmailSchema.parse({ workspaceId, email });
  const { supabase, user } = await requireUser();
  // Bu action herhangi bir e-posta adresine gönderim yapabildiği için
  // (arbitrary recipient) en sıkı limit burada — spam/kötüye kullanım
  // riski en yüksek action.
  await enforceRateLimit(supabase, `sendWorkspaceInviteEmail:${user.id}`, 5, 3600);

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

export async function softDeleteWorkspaceAction(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  // Plain UPDATE ile deleted_at doldurmak, satırı kendi SELECT
  // politikasınca (deleted_at IS NULL) görünmez kıldığı için Postgres
  // tarafından reddedilir — soft-delete/undo bu yüzden SECURITY DEFINER
  // RPC üzerinden yapılıyor (bkz. 20260821090000 migration'ındaki not).
  const { error } = await supabase.rpc("soft_delete_workspace", { _workspace_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu işlemi yapma yetkiniz yok.");
    }
    throw error;
  }

  return { success: true };
}

export async function undoDeleteWorkspaceAction(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("undo_delete_workspace", { _workspace_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu workspace'i geri yükleme yetkiniz yok.");
    }
    throw error;
  }

  return { success: true };
}
