"use server";

import { z } from "zod";
import { requireUser, resolveAuthorProfiles } from "./_shared";

const BUCKET = "workspace-media";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "application/zip",
  "application/x-zip-compressed",
]);
const ALLOWED_EXTENSIONS = new Set(["md"]); // bazı tarayıcılar .md'yi octet-stream olarak yollar

const SIGNED_URL_TTL_SECONDS = 3600;

const ideaIdSchema = z.string().uuid();
const attachmentIdSchema = z.string().uuid();

/** Storage nesne anahtarı (path) için güvenli bir slug üretir — orijinal
 * (Türkçe karakter/boşluk içerebilen) dosya adı `file_name` kolonunda
 * olduğu gibi saklanıp kullanıcıya gösterilmeye devam eder, bu sadece
 * Supabase Storage'ın kabul ettiği anahtar için kullanılır. Aksi halde
 * boşluk/ı-ş-ğ-ü-ö-ç gibi karakterler "Invalid key" hatasına yol açıyordu. */
const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function sanitizeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(COMBINING_DIACRITICS, "");
  const safe = normalized.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return safe.slice(0, 200) || "dosya";
}

export async function uploadAttachment(ideaId: string, formData: FormData) {
  const id = ideaIdSchema.parse(ideaId);
  const { supabase, user } = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Geçerli bir dosya seçilmedi.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Dosya boyutu 10MB'ı aşamaz.");
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Bu dosya türü desteklenmiyor.");
  }

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("workspace_id")
    .eq("id", id)
    .single();
  if (ideaError) throw ideaError;

  const safeName = sanitizeFileName(file.name);
  const path = `${idea.workspace_id}/${id}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) throw uploadError;

  const { data: attachment, error: insertError } = await supabase
    .from("attachments")
    .insert({
      workspace_id: idea.workspace_id,
      idea_id: id,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insertError;
  }

  return attachment;
}

export async function getAttachmentsForIdea(ideaId: string) {
  const id = ideaIdSchema.parse(ideaId);
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("idea_id", id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const profileById = await resolveAuthorProfiles(data.map((a) => a.uploaded_by));

  const items = await Promise.all(
    data.map(async (a) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(a.file_path, SIGNED_URL_TTL_SECONDS);
      return {
        ...a,
        url: signed?.signedUrl ?? null,
        uploaderFullName: profileById.get(a.uploaded_by)?.fullName ?? null,
      };
    })
  );

  return items;
}

export async function softDeleteAttachment(attachmentId: string) {
  const id = attachmentIdSchema.parse(attachmentId);
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("soft_delete_attachment", { _attachment_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu dosyayı silme yetkiniz yok.");
    }
    throw error;
  }

  return { success: true as const };
}

export async function undoDeleteAttachment(attachmentId: string) {
  const id = attachmentIdSchema.parse(attachmentId);
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("undo_delete_attachment", { _attachment_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu dosyayı geri yükleme yetkiniz yok.");
    }
    throw error;
  }

  return { success: true as const };
}

export async function hardDeleteAttachment(attachmentId: string) {
  const id = attachmentIdSchema.parse(attachmentId);
  const { supabase } = await requireUser();

  const { data, error } = await supabase.rpc("hard_delete_attachment", { _attachment_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu dosyayı kalıcı olarak silme yetkiniz yok.");
    }
    throw error;
  }

  if (data?.file_path) {
    await supabase.storage.from(BUCKET).remove([data.file_path]);
  }

  return { success: true as const };
}
