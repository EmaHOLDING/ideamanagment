-- Faz 9: Soft Delete + Undo Toast. ideas/comments artık gerçek DELETE yerine
-- deleted_at/deleted_by ile işaretleniyor; standart SELECT'ler bunları
-- otomatik gizliyor, 60sn'lik "Geri Al" penceresi boyunca veri DB'de duruyor.

ALTER TABLE ideas ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE ideas ADD COLUMN deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;

ALTER TABLE comments ADD COLUMN deleted_at timestamptz DEFAULT NULL;
ALTER TABLE comments ADD COLUMN deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;

CREATE INDEX idx_ideas_workspace_deleted ON ideas(workspace_id, deleted_at);
CREATE INDEX idx_comments_idea_deleted ON comments(idea_id, deleted_at);

-- =========================================================
-- SELECT politikaları: soft-delete edilmiş satırlar standart
-- sorgulardan gizlenir. ideas'ın UPDATE politikasına (Faz 8:
-- owners_creators_can_update_ideas) dokunulmuyor — zaten doğru izni
-- veriyor ve deleted_at'e göre filtrelenmiyor (aksi halde geri
-- yükleme bloklanırdı).
-- =========================================================
DROP POLICY IF EXISTS "members_can_select_ideas" ON ideas;
CREATE POLICY "members_can_select_ideas"
ON ideas FOR SELECT
USING (is_workspace_member(workspace_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "members_can_select_comments" ON comments;
CREATE POLICY "members_can_select_comments"
ON comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = comments.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
  AND deleted_at IS NULL
);

-- =========================================================
-- ideas'ın UPDATE RLS'si (owners_creators_can_update_ideas) soft-delete
-- izin mantığıyla birebir eşleşiyor, ama plain .update() ile
-- deleted_by'ı doldurmak Postgres'te 42501 (insufficient_privilege)
-- hatası veriyor: deleted_by uuid REFERENCES auth.users(id) FK'sinin
-- doğrulanması, referans verilen auth.users tablosunda SELECT/REFERENCES
-- yetkisi gerektiriyor ve authenticated rolünün auth.users üzerinde HİÇ
-- yetkisi yok (assignee_id için de aynı sebeple assign_idea RPC'si var).
-- Bu yüzden ideas için de move_idea/assign_idea ile aynı SECURITY
-- DEFINER RPC deseni kullanılıyor (fonksiyon sahibinin yetkisiyle
-- çalıştığı için auth.users FK kontrolünü sorunsuz geçiyor).
-- =========================================================
CREATE OR REPLACE FUNCTION public.soft_delete_idea(_idea_id uuid)
RETURNS ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_idea ideas;
  v_created_by uuid;
  v_workspace_id uuid;
BEGIN
  SELECT created_by, workspace_id INTO v_created_by, v_workspace_id
  FROM ideas WHERE id = _idea_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'idea not found';
  END IF;

  IF v_created_by IS DISTINCT FROM auth.uid() AND NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the creator or workspace managers can delete this idea';
  END IF;

  UPDATE ideas
  SET deleted_at = timezone('utc'::text, now()),
      deleted_by = auth.uid()
  WHERE id = _idea_id
  RETURNING * INTO updated_idea;

  RETURN updated_idea;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_idea(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_delete_idea(_idea_id uuid)
RETURNS ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_idea ideas;
  v_created_by uuid;
  v_workspace_id uuid;
BEGIN
  SELECT created_by, workspace_id INTO v_created_by, v_workspace_id
  FROM ideas WHERE id = _idea_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'idea not found';
  END IF;

  IF v_created_by IS DISTINCT FROM auth.uid() AND NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the creator or workspace managers can restore this idea';
  END IF;

  UPDATE ideas
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = _idea_id
  RETURNING * INTO updated_idea;

  RETURN updated_idea;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_delete_idea(uuid) TO authenticated;

-- =========================================================
-- comments'in UPDATE RLS'si (Faz 8: authors_can_update_own_comments)
-- yazar-only, ama soft-delete/undo yetkisi yazar VEYA Owner/Admin
-- olmalı (authors_or_managers_can_delete_comments ile aynı kural).
-- Plain UPDATE bunu ifade edemediği için move_idea/assign_idea ile
-- aynı SECURITY DEFINER RPC deseni kullanılıyor.
-- =========================================================
CREATE OR REPLACE FUNCTION public.soft_delete_comment(_comment_id uuid)
RETURNS comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_comment comments;
  v_author_id uuid;
  v_workspace_id uuid;
BEGIN
  SELECT comments.user_id, ideas.workspace_id
  INTO v_author_id, v_workspace_id
  FROM comments
  JOIN ideas ON ideas.id = comments.idea_id
  WHERE comments.id = _comment_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'comment not found';
  END IF;

  IF v_author_id IS DISTINCT FROM auth.uid() AND NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the author or workspace managers can delete this comment';
  END IF;

  UPDATE comments
  SET deleted_at = timezone('utc'::text, now()),
      deleted_by = auth.uid()
  WHERE id = _comment_id
  RETURNING * INTO updated_comment;

  RETURN updated_comment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_comment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_delete_comment(_comment_id uuid)
RETURNS comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_comment comments;
  v_author_id uuid;
  v_workspace_id uuid;
BEGIN
  SELECT comments.user_id, ideas.workspace_id
  INTO v_author_id, v_workspace_id
  FROM comments
  JOIN ideas ON ideas.id = comments.idea_id
  WHERE comments.id = _comment_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'comment not found';
  END IF;

  IF v_author_id IS DISTINCT FROM auth.uid() AND NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the author or workspace managers can restore this comment';
  END IF;

  UPDATE comments
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = _comment_id
  RETURNING * INTO updated_comment;

  RETURN updated_comment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_delete_comment(uuid) TO authenticated;
