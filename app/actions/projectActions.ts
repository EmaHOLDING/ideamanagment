"use server";

import { z } from "zod";
import { requireUser, logActivity, getDisplayName, withAuthRetry } from "./_shared";

const workspaceIdSchema = z.string().uuid();

export async function getWorkspaceProjects(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  return withAuthRetry(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("workspace_id", id)
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  });
}

/** Projeler sayfası için: projeler + her birine bağlı (silinmemiş) fikir
 * sayısı. Sayım, projects üzerinden embed ile DEĞİL ayrı bir sorguyla
 * yapılıyor: projects.origin_idea_id eklendiğinden beri ideas<->projects
 * arasında iki ilişki var ve PostgREST embed'i ayrıştıramıyor. */
export async function getWorkspaceProjectsWithCounts(workspaceId: string) {
  const id = workspaceIdSchema.parse(workspaceId);
  const { supabase } = await requireUser();

  return withAuthRetry(async () => {
    const [projectsResult, ideaRowsResult] = await Promise.all([
      supabase.from("projects").select("*").eq("workspace_id", id).order("name", { ascending: true }),
      supabase
        .from("ideas")
        .select("project_id")
        .eq("workspace_id", id)
        .is("deleted_at", null)
        .not("project_id", "is", null),
    ]);

    if (projectsResult.error) throw projectsResult.error;
    if (ideaRowsResult.error) throw ideaRowsResult.error;

    const countByProject: Record<string, number> = {};
    for (const row of ideaRowsResult.data ?? []) {
      if (row.project_id) {
        countByProject[row.project_id] = (countByProject[row.project_id] ?? 0) + 1;
      }
    }

    return (projectsResult.data ?? []).map((project) => ({
      ...project,
      ideaCount: countByProject[project.id] ?? 0,
    }));
  });
}

const createProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().optional().nullable(),
  problemStatement: z.string().trim().optional().nullable(),
  targetAudience: z.string().trim().optional().nullable(),
});

export type ProjectFormData = {
  name: string;
  description?: string | null;
  problemStatement?: string | null;
  targetAudience?: string | null;
};

export async function createProject(workspaceId: string, data: ProjectFormData) {
  const input = createProjectSchema.parse({ workspaceId, ...data });
  const { supabase, user } = await requireUser();

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: input.workspaceId,
      name: input.name,
      description: input.description || null,
      problem_statement: input.problemStatement || null,
      target_audience: input.targetAudience || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Bu isimde bir proje zaten var.");
    }
    throw error;
  }

  await logActivity(supabase, {
    workspaceId: input.workspaceId,
    actorId: user.id,
    type: "project_created",
    message: `${getDisplayName(user)}, '${input.name}' projesini oluşturdu.`,
  });

  return project;
}

const updateProjectSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().optional().nullable(),
  problemStatement: z.string().trim().optional().nullable(),
  targetAudience: z.string().trim().optional().nullable(),
});

export async function updateProject(projectId: string, data: ProjectFormData) {
  const input = updateProjectSchema.parse({ projectId, ...data });
  const { supabase } = await requireUser();

  const { data: project, error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      description: input.description || null,
      problem_statement: input.problemStatement || null,
      target_audience: input.targetAudience || null,
    })
    .eq("id", input.projectId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Bu isimde bir proje zaten var.");
    }
    throw error;
  }

  if (!project) {
    throw new Error("Bu işlemi yapma yetkiniz yok.");
  }

  return project;
}

const projectIdSchema = z.string().uuid();

export async function getProjectIdeaCount(projectId: string) {
  const id = projectIdSchema.parse(projectId);
  const { supabase } = await requireUser();

  const { count, error } = await supabase
    .from("ideas")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id)
    .is("deleted_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function softDeleteProject(projectId: string) {
  const id = projectIdSchema.parse(projectId);
  const { supabase, user } = await requireUser();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("workspace_id, name")
    .eq("id", id)
    .single();

  if (projectError) throw projectError;

  const { data, error } = await supabase.rpc("soft_delete_project", { _project_id: id });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu işlemi yapma yetkiniz yok.");
    }
    throw error;
  }

  const result = data as { project: unknown; cascaded_idea_ids: string[] };
  const cascadedIdeaIds = result.cascaded_idea_ids ?? [];

  await logActivity(supabase, {
    workspaceId: project.workspace_id,
    actorId: user.id,
    type: "project_deleted",
    message:
      cascadedIdeaIds.length > 0
        ? `${getDisplayName(user)}, '${project.name}' projesini ve ona bağlı ${cascadedIdeaIds.length} fikri sildi.`
        : `${getDisplayName(user)}, '${project.name}' projesini sildi.`,
  });

  return { success: true as const, cascadedIdeaIds };
}

const undoDeleteProjectSchema = z.object({
  projectId: z.string().uuid(),
  cascadedIdeaIds: z.array(z.string().uuid()),
});

export async function undoDeleteProject(projectId: string, cascadedIdeaIds: string[]) {
  const input = undoDeleteProjectSchema.parse({ projectId, cascadedIdeaIds });
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("undo_delete_project", {
    _project_id: input.projectId,
    _cascaded_idea_ids: input.cascadedIdeaIds,
  });

  if (error) {
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu projeyi geri yükleme yetkiniz yok.");
    }
    throw error;
  }

  return { success: true as const };
}

/** Olgunlaşmış bir fikri projeye terfi ettirir: proje fikrin güncel
 * versiyonundan tohumlanarak oluşur, kaynak fikir panoda kalıp o projenin
 * ilk fikri olur. Proje oluşturmanın ANA yolu budur; Ayarlar'daki doğrudan
 * oluşturma (createProject) ikincil yoldur. */
export async function convertIdeaToProject(ideaId: string) {
  const id = projectIdSchema.parse(ideaId);
  const { supabase, user } = await requireUser();

  const { data: project, error } = await supabase.rpc("convert_idea_to_project", {
    _idea_id: id,
  });

  if (error) {
    if (error.message.includes("already_linked")) {
      throw new Error("Bu fikir zaten bir projeye bağlı, projeye dönüştürülemez.");
    }
    if (error.message.includes("already_promoted")) {
      throw new Error("Bu fikir zaten bir projeye dönüştürülmüş.");
    }
    if (error.code === "23505") {
      throw new Error("Bu isimde bir proje zaten var. Önce fikrin başlığını değiştirin.");
    }
    if (error.message.includes("permission_denied")) {
      throw new Error("Bu fikri projeye dönüştürme yetkiniz yok.");
    }
    throw error;
  }

  await logActivity(supabase, {
    workspaceId: project.workspace_id,
    actorId: user.id,
    ideaId: id,
    type: "idea_converted_to_project",
    message: `${getDisplayName(user)}, '${project.name}' fikrini projeye dönüştürdü.`,
  });

  return project;
}

const setIdeaProjectSchema = z.object({
  ideaId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
});

export async function setIdeaProject(ideaId: string, projectId: string | null) {
  const input = setIdeaProjectSchema.parse({ ideaId, projectId });
  const { supabase, user } = await requireUser();

  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("id, workspace_id, idea_versions(title, version_number)")
    .eq("id", input.ideaId)
    .single();

  if (ideaError) throw ideaError;

  const { data: updatedIdea, error: updateError } = await supabase.rpc("set_idea_project", {
    _idea_id: input.ideaId,
    _project_id: input.projectId ?? undefined,
  });

  if (updateError) {
    if (updateError.message.includes("permission_denied")) {
      throw new Error("Bu fikrin projesini değiştirme yetkiniz yok.");
    }
    throw updateError;
  }

  const latestVersion = idea.idea_versions
    .slice()
    .sort((a, b) => b.version_number - a.version_number)[0];
  const ideaTitle = latestVersion?.title ?? "";

  await logActivity(supabase, {
    workspaceId: idea.workspace_id,
    actorId: user.id,
    ideaId: input.ideaId,
    type: "idea_project_updated",
    message: input.projectId
      ? `${getDisplayName(user)}, '${ideaTitle}' fikrini bir projeye bağladı.`
      : `${getDisplayName(user)}, '${ideaTitle}' fikrini bağımsız hale getirdi.`,
  });

  return updatedIdea;
}

/** İleride eklenecek AI özellikleri için: bir projenin tüm bağlamını
 * (kendi tanımı + o an ona bağlı tüm fikirlerin güncel versiyonları) tek
 * sorguda döner. Şu an hiçbir AI mantığı çalıştırmıyor, sadece veri getirir. */
export async function getProjectContext(projectId: string) {
  const id = projectIdSchema.parse(projectId);
  const { supabase } = await requireUser();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (projectError) throw projectError;

  const { data: ideas, error: ideasError } = await supabase
    .from("ideas")
    .select("*, idea_versions(*)")
    .eq("project_id", id)
    .is("deleted_at", null);

  if (ideasError) throw ideasError;

  return { project, ideas };
}
