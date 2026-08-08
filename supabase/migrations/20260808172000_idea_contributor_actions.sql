-- Faz 8 devamı: ideas tablosundaki UPDATE RLS'si artık sadece
-- oluşturan/owner/admin'e açık (içerik düzenleme kuralı, bkz.
-- _role_based_permissions.sql). Ancak fikir taşıma (kart sürükleme) ve
-- atama, içerik düzenleme değildir — tüm contributor'lara (Viewer
-- hariç herkese) açık kalması gerekir. Bu iki aksiyon SECURITY DEFINER
-- RPC'ler üzerinden yapılır, böylece ideas UPDATE RLS'sini
-- (creator-or-admin) bypass edip kendi (contributor) yetki
-- kontrollerini uygularlar.

CREATE OR REPLACE FUNCTION public.move_idea(
  _idea_id uuid,
  _target_column_id uuid,
  _cancellation_reason text DEFAULT NULL
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
    RAISE EXCEPTION 'permission_denied: only contributors can move ideas';
  END IF;

  UPDATE ideas
  SET column_id = _target_column_id,
      cancellation_reason = _cancellation_reason,
      updated_at = timezone('utc'::text, now())
  WHERE id = _idea_id
  RETURNING * INTO updated_idea;

  RETURN updated_idea;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_idea(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_idea(
  _idea_id uuid,
  _assignee_user_id uuid DEFAULT NULL
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
    RAISE EXCEPTION 'permission_denied: only contributors can assign ideas';
  END IF;

  IF _assignee_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = v_workspace_id AND user_id = _assignee_user_id
  ) THEN
    RAISE EXCEPTION 'assignee is not a member of this workspace';
  END IF;

  UPDATE ideas
  SET assignee_id = _assignee_user_id
  WHERE id = _idea_id
  RETURNING * INTO updated_idea;

  RETURN updated_idea;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_idea(uuid, uuid) TO authenticated;
