-- Faz 6: Workspace rolleri (Owner/Member).
-- Owner = workspace'i kuran kullanıcı. Board yapısını değiştiren
-- aksiyonlar (kolon ekle/sil, workspace ayarları, üye çıkarma,
-- workspace silme) sadece Owner'a ait; fikir/yorum/oylama/atama gibi
-- işbirliği aksiyonları tüm üyelere açık kalır (bkz. Bölüm 6.A'nın
-- devamı, Faz 6 planı).

CREATE TYPE workspace_role AS ENUM ('OWNER', 'MEMBER');

ALTER TABLE workspace_members ADD COLUMN role workspace_role NOT NULL DEFAULT 'MEMBER';

-- =========================================================
-- Yardımcı fonksiyon: is_workspace_owner
-- is_workspace_member ile aynı recursion-kırma deseni (SECURITY
-- DEFINER, workspace_members'a subquery yerine bu fonksiyon üzerinden
-- erişim).
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = _workspace_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role = 'OWNER'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_owner(uuid) TO anon, authenticated, service_role;

-- =========================================================
-- create_workspace RPC: kurucu artık OWNER rolüyle ekleniyor.
-- İmza değişmedi, CREATE OR REPLACE yeterli.
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_workspace(
  _title varchar,
  _template_id uuid DEFAULT NULL
)
RETURNS workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace workspaces;
  found_columns_config jsonb;
  col jsonb;
  idx int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  INSERT INTO workspaces (title) VALUES (_title) RETURNING * INTO new_workspace;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace.id, auth.uid(), 'OWNER');

  IF _template_id IS NOT NULL THEN
    SELECT bt.columns_config INTO found_columns_config
    FROM board_templates bt
    WHERE bt.id = _template_id
    AND (bt.is_system = true OR bt.user_id = auth.uid());

    IF found_columns_config IS NULL THEN
      RAISE EXCEPTION 'template not found or access denied';
    END IF;

    FOR col IN SELECT * FROM jsonb_array_elements(found_columns_config)
    LOOP
      INSERT INTO kanban_columns (workspace_id, title, status_type, "order")
      VALUES (new_workspace.id, col->>'title', (col->>'status_type')::status_type, idx);
      idx := idx + 1;
    END LOOP;
  END IF;

  RETURN new_workspace;
END;
$$;

-- =========================================================
-- transfer_workspace_ownership RPC: sahiplik devri tek transaction'da
-- atomik yapılır (eski owner MEMBER, yeni owner OWNER olur). Sadece
-- mevcut owner çağırabilir; hedef kullanıcı zaten üye olmalı.
-- =========================================================
CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
  _workspace_id uuid,
  _new_owner_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role workspace_role;
  target_is_member boolean;
BEGIN
  SELECT role INTO caller_role FROM workspace_members
  WHERE workspace_id = _workspace_id AND user_id = auth.uid();

  IF caller_role IS DISTINCT FROM 'OWNER' THEN
    RAISE EXCEPTION 'only the current owner can transfer ownership';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = _workspace_id AND user_id = _new_owner_user_id
  ) INTO target_is_member;

  IF NOT target_is_member THEN
    RAISE EXCEPTION 'target user is not a member of this workspace';
  END IF;

  UPDATE workspace_members SET role = 'MEMBER'
  WHERE workspace_id = _workspace_id AND user_id = auth.uid();

  UPDATE workspace_members SET role = 'OWNER'
  WHERE workspace_id = _workspace_id AND user_id = _new_owner_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_workspace_ownership(uuid, uuid) TO authenticated;

-- =========================================================
-- RLS sıkılaştırmaları
-- =========================================================

-- workspaces: adı değiştirme/invite_code yenileme/silme artık owner-only.
DROP POLICY IF EXISTS "members_can_update_workspace" ON workspaces;
DROP POLICY IF EXISTS "members_can_delete_workspace" ON workspaces;

CREATE POLICY "owners_can_update_workspace"
ON workspaces FOR UPDATE
USING (is_workspace_owner(id));

CREATE POLICY "owners_can_delete_workspace"
ON workspaces FOR DELETE
USING (is_workspace_owner(id));

-- kanban_columns: okuma tüm üyelere açık kalır, ekleme/güncelleme/silme
-- owner-only olur (tek FOR ALL politikası dörde bölünüyor).
DROP POLICY IF EXISTS "workspace_members_can_access_kanban_columns" ON kanban_columns;

CREATE POLICY "members_can_select_kanban_columns"
ON kanban_columns FOR SELECT
USING (is_workspace_member(workspace_id));

CREATE POLICY "owners_can_insert_kanban_columns"
ON kanban_columns FOR INSERT
WITH CHECK (is_workspace_owner(workspace_id));

CREATE POLICY "owners_can_update_kanban_columns"
ON kanban_columns FOR UPDATE
USING (is_workspace_owner(workspace_id))
WITH CHECK (is_workspace_owner(workspace_id));

CREATE POLICY "owners_can_delete_kanban_columns"
ON kanban_columns FOR DELETE
USING (is_workspace_owner(workspace_id));

-- workspace_members: owner, kendi dışındaki üyeleri de çıkarabilir
-- (mevcut "user_can_delete_own_membership" politikasıyla birlikte OR'lanır).
CREATE POLICY "owners_can_remove_members"
ON workspace_members FOR DELETE
USING (is_workspace_owner(workspace_id));
