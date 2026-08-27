"use server";

import { z } from "zod";
import { requireUser, encodeCursor, decodeCursor, resolveAuthorProfiles } from "./_shared";

const getActivityLogSchema = z.object({
  workspaceId: z.string().uuid(),
  cursor: z.string().optional(),
  actorId: z.string().uuid().optional(),
  actionGroup: z.enum(["ideas", "projects", "comments", "tags", "columns", "members", "archives"]).optional(),
});

const PAGE_SIZE = 30;

const ACTIVITY_TYPES_BY_GROUP = {
  ideas: ["idea_created", "idea_updated", "idea_moved", "idea_assigned", "idea_voted", "idea_project_updated", "idea_converted_to_project"],
  projects: ["project_created", "project_deleted", "idea_project_updated", "idea_converted_to_project"],
  comments: ["comment_added"],
  tags: ["tag_created", "tag_deleted", "idea_tags_updated"],
  columns: ["column_created", "column_deleted"],
  members: ["member_joined"],
  archives: ["idea_archived", "project_archived"],
} as const;

export type ActivityActionGroup = keyof typeof ACTIVITY_TYPES_BY_GROUP;
export type ActivityFilters = { actorId?: string; actionGroup?: ActivityActionGroup };

export async function getActivityLog(workspaceId: string, cursor?: string, filters: ActivityFilters = {}) {
  const input = getActivityLogSchema.parse({ workspaceId, cursor, ...filters });
  const { supabase } = await requireUser();

  const decoded = decodeCursor(input.cursor);

  let query = supabase
    .from("activity_log")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);

  if (input.actorId) query = query.eq("actor_id", input.actorId);
  if (input.actionGroup) query = query.in("type", [...ACTIVITY_TYPES_BY_GROUP[input.actionGroup]]);

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
