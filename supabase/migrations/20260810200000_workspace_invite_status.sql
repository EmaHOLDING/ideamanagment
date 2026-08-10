-- =========================================================
-- workspace_members.status: davet kodu/linkiyle katılan kullanıcı
-- artık anında ACTIVE olmuyor, önce PENDING olarak eklenir; kendi
-- workspace listesinde "Kabul Et / Reddet" ile karar verir.
-- Mevcut satırlar DEFAULT 'ACTIVE' ile geriye dönük dolduruluyor.
-- =========================================================
CREATE TYPE workspace_member_status AS ENUM ('PENDING', 'ACTIVE');

ALTER TABLE workspace_members
  ADD COLUMN status workspace_member_status NOT NULL DEFAULT 'ACTIVE';

-- =========================================================
-- join_workspace_by_invite_code: artık PENDING statüsüyle ekler.
-- ON CONFLICT DO NOTHING korunuyor — zaten üye (PENDING veya ACTIVE)
-- olan biri linke tekrar tıklarsa mevcut statüsü değişmez.
-- =========================================================
CREATE OR REPLACE FUNCTION public.join_workspace_by_invite_code(
  _invite_code varchar
)
RETURNS workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_workspace workspaces;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT * INTO target_workspace FROM workspaces WHERE invite_code = _invite_code;

  IF target_workspace.id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite_code';
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role, status)
  VALUES (target_workspace.id, auth.uid(), target_workspace.default_invite_role, 'PENDING')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN target_workspace;
END;
$$;

-- =========================================================
-- Yardımcı fonksiyonlara status filtresi eklenir: artık sadece
-- ACTIVE üyeler board içeriğine (kolonlar/fikirler/yorumlar/dosyalar/
-- aktivite/vb.) erişebiliyor. Bu tek değişiklik, tüm bu tabloların
-- RLS politikalarına otomatik yansır (hepsi bu fonksiyonları çağırıyor).
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
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
    AND workspace_members.status = 'ACTIVE'
  );
$$;

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
    AND workspace_members.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner_or_admin(_workspace_id uuid)
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
    AND workspace_members.role IN ('OWNER', 'ADMIN')
    AND workspace_members.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_contributor(_workspace_id uuid)
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
    AND workspace_members.role <> 'VIEWER'
    AND workspace_members.status = 'ACTIVE'
  );
$$;

-- =========================================================
-- is_workspace_member_any_status: is_workspace_member'ın eski
-- (status filtresiz) davranışı — sadece workspaces tablosunun SELECT
-- politikasında kullanılır, böylece PENDING kullanıcı kendi bekleyen
-- workspace'inin başlığını görebilir (ama board içeriğini göremez).
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_workspace_member_any_status(_workspace_id uuid)
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
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member_any_status(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "members_can_select_workspace" ON workspaces;
CREATE POLICY "members_can_select_workspace"
ON workspaces FOR SELECT
USING (is_workspace_member_any_status(id));

-- workspace_members: PENDING kullanıcı en azından kendi satırını
-- görebilsin (co-member listesi hâlâ sadece ACTIVE üyelere açık).
DROP POLICY IF EXISTS "members_can_select_workspace_members" ON workspace_members;
CREATE POLICY "members_can_select_workspace_members"
ON workspace_members FOR SELECT
USING (user_id = auth.uid() OR is_workspace_member(workspace_id));

-- =========================================================
-- accept_workspace_invite: çağıranın PENDING satırını ACTIVE yapar.
-- Role'e dokunmaz (yetki yükseltme riski yok).
-- =========================================================
CREATE OR REPLACE FUNCTION public.accept_workspace_invite(_workspace_id uuid)
RETURNS workspace_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row workspace_members;
BEGIN
  UPDATE workspace_members
  SET status = 'ACTIVE'
  WHERE workspace_id = _workspace_id
  AND user_id = auth.uid()
  AND status = 'PENDING'
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'no_pending_invite';
  END IF;

  RETURN updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(uuid) TO authenticated;

-- =========================================================
-- get_workspace_member_count: bekleyen davet kartında "şu an X kişi
-- var" bilgisini göstermek için (RLS bypass, PENDING kullanıcı da
-- çağırabilir).
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_workspace_member_count(_workspace_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*)::integer FROM workspace_members
  WHERE workspace_id = _workspace_id AND status = 'ACTIVE';
$$;

GRANT EXECUTE ON FUNCTION public.get_workspace_member_count(uuid) TO authenticated;
