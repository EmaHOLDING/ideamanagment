-- Faz 18: Hiyerarşik fikir mimarisi — "Proje" kavramı. Bir proje, workspace
-- içinde birden fazla fikri/özelliği bir araya toplayan üst düzey bir
-- konteyner: kendi Problem Tanımı/Hedef Kitle'sini tanımlar. Bir fikir
-- project_id ile bir projeye bağlandığında, kendi problem_statement/
-- target_audience alanları boşsa bu tanımı miras alır — bu tamamen UI
-- tarafında (placeholder + fallback görüntüleme) hesaplanır, hiçbir veri
-- DB'ye kopyalanmaz (proje tanımı değişince tüm bağlı fikirler otomatik
-- günceli yansıtır).
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description varchar(500) NULL,
  problem_statement text NULL,
  target_audience text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL,
  deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL,
  UNIQUE (workspace_id, name)
);

CREATE INDEX idx_projects_workspace_deleted ON projects(workspace_id, deleted_at);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_can_select_projects"
ON projects FOR SELECT
USING (is_workspace_member(workspace_id) AND deleted_at IS NULL);

CREATE POLICY "contributors_can_insert_projects"
ON projects FOR INSERT
WITH CHECK (is_workspace_contributor(workspace_id) AND created_by = auth.uid());

CREATE POLICY "contributors_can_update_projects"
ON projects FOR UPDATE
USING (is_workspace_contributor(workspace_id))
WITH CHECK (is_workspace_contributor(workspace_id));

-- =========================================================
-- ideas.project_id — bir fikir en fazla bir projeye bağlanabilir
-- (bağımsızsa NULL). ON DELETE SET NULL sadece savunma amaçlı; normal
-- akışta proje gerçekten DELETE edilmiyor, soft-delete kullanılıyor.
-- =========================================================
ALTER TABLE ideas ADD COLUMN project_id uuid NULL REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_ideas_project ON ideas(project_id);

-- =========================================================
-- set_idea_project: assign_idea ile birebir aynı desen (SECURITY DEFINER,
-- contributor yetkisi) + proje verildiyse aynı workspace'e ait ve silinmemiş
-- olma kontrolü.
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_idea_project(
  _idea_id uuid,
  _project_id uuid DEFAULT NULL
)
RETURNS ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_idea ideas;
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM ideas WHERE id = _idea_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'idea not found';
  END IF;

  IF NOT is_workspace_contributor(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only contributors can assign a project';
  END IF;

  IF _project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = _project_id AND workspace_id = v_workspace_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'project not found in this workspace';
  END IF;

  UPDATE ideas
  SET project_id = _project_id
  WHERE id = _idea_id
  RETURNING * INTO updated_idea;

  RETURN updated_idea;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_idea_project(uuid, uuid) TO authenticated;

-- =========================================================
-- soft_delete_project: proje silinirken o an ona bağlı olan TÜM fikirler
-- de aynı transaction içinde soft-delete edilir (kullanıcı onayı: proje +
-- bağlı fikirler tek pakette silinip tek "Geri Al" ile hepsi geri gelsin).
-- Etkilenen idea id listesi jsonb olarak dönülür ki undo_delete_project
-- SADECE bunları geri getirsin — proje silinmeden ÖNCE zaten bağımsız
-- olarak silinmiş fikirler bu işlemden etkilenmemeli.
-- =========================================================
CREATE OR REPLACE FUNCTION public.soft_delete_project(_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_project projects;
  v_workspace_id uuid;
  v_idea_ids uuid[];
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM projects WHERE id = _project_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'project not found';
  END IF;

  IF NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only workspace managers can delete a project';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_idea_ids
  FROM ideas
  WHERE project_id = _project_id AND deleted_at IS NULL;

  UPDATE ideas
  SET deleted_at = timezone('utc'::text, now()), deleted_by = auth.uid()
  WHERE id = ANY(v_idea_ids);

  UPDATE projects
  SET deleted_at = timezone('utc'::text, now()), deleted_by = auth.uid()
  WHERE id = _project_id
  RETURNING * INTO updated_project;

  RETURN jsonb_build_object(
    'project', to_jsonb(updated_project),
    'cascaded_idea_ids', to_jsonb(v_idea_ids)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_project(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_delete_project(
  _project_id uuid,
  _cascaded_idea_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_project projects;
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM projects WHERE id = _project_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'project not found';
  END IF;

  IF NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only workspace managers can restore a project';
  END IF;

  UPDATE projects
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = _project_id
  RETURNING * INTO updated_project;

  IF array_length(_cascaded_idea_ids, 1) > 0 THEN
    UPDATE ideas
    SET deleted_at = NULL, deleted_by = NULL
    WHERE id = ANY(_cascaded_idea_ids) AND project_id = _project_id;
  END IF;

  RETURN updated_project;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_delete_project(uuid, uuid[]) TO authenticated;
