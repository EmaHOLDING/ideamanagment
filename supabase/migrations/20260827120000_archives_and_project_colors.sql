-- Fikir ve projeler için silmeden bağımsız arşiv yaşam döngüsü ile
-- projelerin Kanban'da kullanılacak görsel rengi.
ALTER TABLE ideas
  ADD COLUMN archived_at timestamptz DEFAULT NULL,
  ADD COLUMN archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN archived_via_project_id uuid NULL;

ALTER TABLE projects
  ADD COLUMN archived_at timestamptz DEFAULT NULL,
  ADD COLUMN archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL,
  ADD COLUMN color varchar(20) NOT NULL DEFAULT 'indigo';

ALTER TABLE ideas ADD CONSTRAINT ideas_archived_via_project_id_fkey
  FOREIGN KEY (archived_via_project_id) REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX idx_ideas_workspace_archived ON ideas(workspace_id, archived_at);
CREATE INDEX idx_projects_workspace_archived ON projects(workspace_id, archived_at);

CREATE OR REPLACE FUNCTION public.archive_idea(_idea_id uuid)
RETURNS ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_idea ideas;
  v_workspace_id uuid;
  v_created_by uuid;
BEGIN
  SELECT workspace_id, created_by INTO v_workspace_id, v_created_by
  FROM ideas WHERE id = _idea_id AND deleted_at IS NULL;

  IF v_workspace_id IS NULL THEN RAISE EXCEPTION 'idea not found'; END IF;
  IF auth.uid() <> v_created_by AND NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  UPDATE ideas
  SET archived_at = timezone('utc'::text, now()), archived_by = auth.uid(), archived_via_project_id = NULL
  WHERE id = _idea_id
  RETURNING * INTO updated_idea;
  RETURN updated_idea;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_archived_idea(_idea_id uuid)
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
  IF v_workspace_id IS NULL THEN RAISE EXCEPTION 'idea not found'; END IF;
  IF NOT is_workspace_contributor(v_workspace_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;

  UPDATE ideas SET archived_at = NULL, archived_by = NULL, archived_via_project_id = NULL
  WHERE id = _idea_id AND deleted_at IS NULL
  RETURNING * INTO updated_idea;
  RETURN updated_idea;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_project(_project_id uuid)
RETURNS projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_project projects;
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM projects
  WHERE id = _project_id AND deleted_at IS NULL;
  IF v_workspace_id IS NULL THEN RAISE EXCEPTION 'project not found'; END IF;
  IF NOT is_workspace_owner_or_admin(v_workspace_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;

  UPDATE projects
  SET archived_at = timezone('utc'::text, now()), archived_by = auth.uid()
  WHERE id = _project_id
  RETURNING * INTO updated_project;

  UPDATE ideas
  SET archived_at = timezone('utc'::text, now()),
      archived_by = auth.uid(),
      archived_via_project_id = _project_id
  WHERE project_id = _project_id AND deleted_at IS NULL AND archived_at IS NULL;
  RETURN updated_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_archived_project(_project_id uuid)
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
  IF v_workspace_id IS NULL THEN RAISE EXCEPTION 'project not found'; END IF;
  IF NOT is_workspace_owner_or_admin(v_workspace_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;

  UPDATE projects SET archived_at = NULL, archived_by = NULL
  WHERE id = _project_id AND deleted_at IS NULL
  RETURNING * INTO updated_project;

  UPDATE ideas
  SET archived_at = NULL, archived_by = NULL, archived_via_project_id = NULL
  WHERE archived_via_project_id = _project_id AND deleted_at IS NULL;
  RETURN updated_project;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_idea(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_archived_idea(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_archived_project(uuid) TO authenticated;

-- Arşivdeki bir proje yeni fikirlere bağlanamaz; arşivlenmiş fikirler de taşınamaz.
CREATE OR REPLACE FUNCTION public.set_idea_project(_idea_id uuid, _project_id uuid DEFAULT NULL)
RETURNS ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_idea ideas;
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM ideas
  WHERE id = _idea_id AND deleted_at IS NULL AND archived_at IS NULL;
  IF v_workspace_id IS NULL THEN RAISE EXCEPTION 'idea not found'; END IF;
  IF NOT is_workspace_contributor(v_workspace_id) THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF _project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM projects WHERE id = _project_id AND workspace_id = v_workspace_id
      AND deleted_at IS NULL AND archived_at IS NULL
  ) THEN RAISE EXCEPTION 'project not found in this workspace'; END IF;

  UPDATE ideas SET project_id = _project_id WHERE id = _idea_id RETURNING * INTO updated_idea;
  RETURN updated_idea;
END;
$$;
