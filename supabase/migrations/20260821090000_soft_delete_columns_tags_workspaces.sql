-- Faz 17: Kolon/Etiket/Workspace silme + üye çıkarma için de "Geri Al" toast'ı
-- (Faz 9'da fikir/yorum, sonrasında ek dosyalar için kurulan soft-delete +
-- undo deseninin geri kalan silme işlemlerine genişletilmesi).
--
-- ÖNEMLİ: Bir tablonun SELECT RLS politikası "deleted_at IS NULL" içeriyorsa,
-- normal (SECURITY INVOKER) bir client .update() çağrısıyla deleted_at'i
-- doldurmak İMKANSIZDIR — Postgres, UPDATE sonrası oluşan satırın da mevcut
-- SELECT politikasınca görünür kalmasını şart koşar; deleted_at'i dolduran
-- güncelleme kendi kendini görünmez kıldığı için "new row violates row-level
-- security policy" hatasıyla reddedilir. Bu yüzden ideas/comments'te
-- (Faz 9) olduğu gibi burada da soft-delete/undo, RLS'i atlayan SECURITY
-- DEFINER RPC fonksiyonları üzerinden yapılıyor; düz UPDATE kullanılmıyor.

-- =========================================================
-- 1) kanban_columns — soft delete
-- =========================================================
ALTER TABLE kanban_columns ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE kanban_columns ADD COLUMN deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;
CREATE INDEX idx_kanban_columns_workspace_deleted ON kanban_columns(workspace_id, deleted_at);

DROP POLICY IF EXISTS "members_can_select_kanban_columns" ON kanban_columns;
CREATE POLICY "members_can_select_kanban_columns"
ON kanban_columns FOR SELECT
USING (is_workspace_member(workspace_id) AND deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.soft_delete_column(_column_id uuid)
RETURNS kanban_columns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_column kanban_columns;
  v_workspace_id uuid;
  v_idea_count int;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM kanban_columns WHERE id = _column_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'column not found';
  END IF;

  IF NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only workspace managers can delete a column';
  END IF;

  SELECT count(*) INTO v_idea_count FROM ideas WHERE column_id = _column_id AND deleted_at IS NULL;
  IF v_idea_count > 0 THEN
    RAISE EXCEPTION 'column_not_empty:%', v_idea_count;
  END IF;

  UPDATE kanban_columns
  SET deleted_at = timezone('utc'::text, now()),
      deleted_by = auth.uid()
  WHERE id = _column_id
  RETURNING * INTO updated_column;

  RETURN updated_column;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_column(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_delete_column(_column_id uuid)
RETURNS kanban_columns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_column kanban_columns;
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM kanban_columns WHERE id = _column_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'column not found';
  END IF;

  IF NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only workspace managers can restore a column';
  END IF;

  UPDATE kanban_columns
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = _column_id
  RETURNING * INTO updated_column;

  RETURN updated_column;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_delete_column(uuid) TO authenticated;

-- =========================================================
-- 2) tags — soft delete
-- =========================================================
ALTER TABLE tags ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE tags ADD COLUMN deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;
CREATE INDEX idx_tags_workspace_deleted ON tags(workspace_id, deleted_at);

DROP POLICY IF EXISTS "members_can_select_tags" ON tags;
CREATE POLICY "members_can_select_tags"
ON tags FOR SELECT
USING (is_workspace_member(workspace_id) AND deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.soft_delete_tag(_tag_id uuid)
RETURNS tags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_tag tags;
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM tags WHERE id = _tag_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'tag not found';
  END IF;

  IF NOT is_workspace_contributor(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only workspace contributors can delete a tag';
  END IF;

  UPDATE tags
  SET deleted_at = timezone('utc'::text, now()),
      deleted_by = auth.uid()
  WHERE id = _tag_id
  RETURNING * INTO updated_tag;

  RETURN updated_tag;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_tag(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_delete_tag(_tag_id uuid)
RETURNS tags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_tag tags;
  v_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM tags WHERE id = _tag_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'tag not found';
  END IF;

  IF NOT is_workspace_contributor(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only workspace contributors can restore a tag';
  END IF;

  UPDATE tags
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = _tag_id
  RETURNING * INTO updated_tag;

  RETURN updated_tag;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_delete_tag(uuid) TO authenticated;

-- =========================================================
-- 3) workspaces — soft delete
-- =========================================================
ALTER TABLE workspaces ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;

DROP POLICY IF EXISTS "members_can_select_workspace" ON workspaces;
CREATE POLICY "members_can_select_workspace"
ON workspaces FOR SELECT
USING (is_workspace_member_any_status(id) AND deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.soft_delete_workspace(_workspace_id uuid)
RETURNS workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_workspace workspaces;
BEGIN
  IF NOT is_workspace_owner(_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the workspace owner can delete it';
  END IF;

  UPDATE workspaces
  SET deleted_at = timezone('utc'::text, now()),
      deleted_by = auth.uid()
  WHERE id = _workspace_id
  RETURNING * INTO updated_workspace;

  IF updated_workspace.id IS NULL THEN
    RAISE EXCEPTION 'workspace not found';
  END IF;

  RETURN updated_workspace;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_workspace(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_delete_workspace(_workspace_id uuid)
RETURNS workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_workspace workspaces;
BEGIN
  IF NOT is_workspace_owner(_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the workspace owner can restore it';
  END IF;

  UPDATE workspaces
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = _workspace_id
  RETURNING * INTO updated_workspace;

  IF updated_workspace.id IS NULL THEN
    RAISE EXCEPTION 'workspace not found';
  END IF;

  RETURN updated_workspace;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_delete_workspace(uuid) TO authenticated;

-- =========================================================
-- 4) workspace_members — üye çıkarma zaten kalıcı DELETE (bir "içerik"
-- değil, sadece bir satır); soft-delete yerine snapshot tabanlı undo:
-- silinen satırın (rol) bilgisi client'ta tutulup, "Geri Al" tıklanınca
-- bu RPC ile aynı rolle ACTIVE olarak yeniden eklenir. Normal INSERT RLS
-- politikası (user_can_insert_own_membership) sadece kendi satırını
-- eklemeye izin verdiği için, owner/admin'in BAŞKA bir kullanıcıyı geri
-- eklemesi SECURITY DEFINER bir fonksiyon gerektiriyor.
-- =========================================================
CREATE OR REPLACE FUNCTION public.undo_remove_member(
  _workspace_id uuid,
  _user_id uuid,
  _role workspace_role
)
RETURNS workspace_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restored workspace_members;
BEGIN
  IF NOT is_workspace_owner_or_admin(_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only owner or admin can restore a removed member';
  END IF;

  IF _role = 'OWNER' THEN
    RAISE EXCEPTION 'permission_denied: cannot restore a member as OWNER';
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role, status)
  VALUES (_workspace_id, _user_id, _role, 'ACTIVE')
  ON CONFLICT (workspace_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE'
  RETURNING * INTO restored;

  RETURN restored;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_remove_member(uuid, uuid, workspace_role) TO authenticated;
