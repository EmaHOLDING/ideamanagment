"use server";

import { z } from "zod";
import { requireUser, encodeCursor, decodeCursor, resolveAuthorProfiles } from "./_shared";

const getActivityLogSchema = z.object({
  workspaceId: z.string().uuid(),
  cursor: z.string().optional(),
});

const PAGE_SIZE = 30;

export async function getActivityLog(workspaceId: string, cursor?: string) {
  const input = getActivityLogSchema.parse({ workspaceId, cursor });
  const { supabase } = await requireUser();

  const decoded = decodeCursor(input.cursor);

  let query = supabase
    .from("activity_log")
    .select("*")
    .eq("workspace_id", input.workspaceId)
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

  const profileById = await resolveAuthorProfiles(data.map((row) => row.actor_id));
  const items = data.map((row) => ({
    ...row,
    actorEmail: profileById.get(row.actor_id)?.email ?? null,
    actorFullName: profileById.get(row.actor_id)?.fullName ?? null,
  }));

  const last = data[data.length - 1];
  const nextCursor =
    data.length === PAGE_SIZE && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  return { items, nextCursor };
}
