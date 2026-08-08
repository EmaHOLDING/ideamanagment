"use server";

import { z } from "zod";
import { requireUser, encodeCursor, decodeCursor } from "./_shared";

const PAGE_SIZE = 20;

export async function getNotifications(cursor?: string) {
  const parsedCursor = z.string().optional().parse(cursor);
  const { supabase, user } = await requireUser();

  const decoded = decodeCursor(parsedCursor);

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);

  if (decoded) {
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`
    );
  }

  const { data, error } = await query;

  if (error) throw error;

  const last = data[data.length - 1];
  const nextCursor =
    data.length === PAGE_SIZE && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  return { items: data, nextCursor };
}

const idSchema = z.string().uuid();

export async function markAsRead(id: string) {
  const notificationId = idSchema.parse(id);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) throw error;

  return { success: true };
}

export async function markAllAsRead() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) throw error;

  return { success: true };
}
