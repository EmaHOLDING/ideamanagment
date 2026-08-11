"use server";

import { z } from "zod";
import { requireUser, logActivity, getDisplayName } from "./_shared";

const statusTypeSchema = z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "CANCELLED", "DONE"]);

const createColumnSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  statusType: statusTypeSchema,
  order: z.number().int().min(0),
});

export async function createColumn(
  workspaceId: string,
  title: string,
  statusType: string,
  order: number
) {
  const input = createColumnSchema.parse({ workspaceId, title, statusType, order });
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("kanban_columns")
    .insert({
      workspace_id: input.workspaceId,
      title: input.title,
      status_type: input.statusType,
      order: input.order,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity(supabase, {
    workspaceId: input.workspaceId,
    actorId: user.id,
    type: "column_created",
    message: `${getDisplayName(user)}, '${input.title}' kolonunu oluşturdu.`,
  });

  return data;
}

const updateColumnSchema = z.object({
  columnId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
});

export async function updateColumn(columnId: string, title: string) {
  const input = updateColumnSchema.parse({ columnId, title });
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("kanban_columns")
    .update({ title: input.title })
    .eq("id", input.columnId)
    .select()
    .single();

  if (error || !data) {
    throw new Error("Bu işlemi yapma yetkiniz yok.");
  }

  return data;
}

const reorderColumnsSchema = z.object({
  workspaceId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function reorderColumns(workspaceId: string, orderedIds: string[]) {
  const input = reorderColumnsSchema.parse({ workspaceId, orderedIds });
  const { supabase } = await requireUser();

  await Promise.all(
    input.orderedIds.map((id, index) =>
      supabase
        .from("kanban_columns")
        .update({ order: index })
        .eq("id", id)
        .eq("workspace_id", input.workspaceId)
        .then(({ error }) => {
          if (error) throw error;
        })
    )
  );

  return { success: true };
}

const deleteColumnSchema = z.string().uuid();

export async function deleteColumn(columnId: string) {
  const id = deleteColumnSchema.parse(columnId);
  const { supabase, user } = await requireUser();

  const { data: column, error: columnError } = await supabase
    .from("kanban_columns")
    .select("workspace_id, title")
    .eq("id", id)
    .single();

  if (columnError) throw columnError;

  const { count, error: countError } = await supabase
    .from("ideas")
    .select("id", { count: "exact", head: true })
    .eq("column_id", id);

  if (countError) throw countError;

  if (count && count > 0) {
    return {
      success: false as const,
      reason: "COLUMN_NOT_EMPTY" as const,
      ideaCount: count,
    };
  }

  const { error: deleteError } = await supabase.from("kanban_columns").delete().eq("id", id);

  if (deleteError) {
    // 23503: foreign_key_violation — ON DELETE RESTRICT tarafından engellendi
    // (Bölüm 6.I). Yukarıdaki count kontrolüne rağmen bir race condition
    // olması ihtimaline karşı burada da yakalanır.
    if (deleteError.code === "23503") {
      return { success: false as const, reason: "COLUMN_NOT_EMPTY" as const, ideaCount: null };
    }
    throw deleteError;
  }

  await logActivity(supabase, {
    workspaceId: column.workspace_id,
    actorId: user.id,
    type: "column_deleted",
    message: `${getDisplayName(user)}, '${column.title}' kolonunu sildi.`,
  });

  return { success: true as const };
}
