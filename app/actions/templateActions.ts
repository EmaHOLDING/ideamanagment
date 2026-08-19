"use server";

import { z } from "zod";
import { requireUser, withAuthRetry } from "./_shared";

export async function getTemplates() {
  const { supabase } = await requireUser();

  return withAuthRetry(async () => {
    const { data, error } = await supabase
      .from("board_templates")
      .select("*")
      .order("is_system", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  });
}

const createTemplateFromBoardSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
});

export async function createTemplateFromBoard(workspaceId: string, title: string) {
  const input = createTemplateFromBoardSchema.parse({ workspaceId, title });
  const { supabase, user } = await requireUser();

  const { data: columns, error: columnsError } = await supabase
    .from("kanban_columns")
    .select("title, status_type")
    .eq("workspace_id", input.workspaceId)
    .order("order", { ascending: true });

  if (columnsError) throw columnsError;

  const columnsConfig = columns.map((col) => ({
    title: col.title,
    status_type: col.status_type,
  }));

  const { data: template, error: templateError } = await supabase
    .from("board_templates")
    .insert({
      title: input.title,
      columns_config: columnsConfig,
      is_system: false,
      user_id: user.id,
    })
    .select()
    .single();

  if (templateError) throw templateError;

  return template;
}
