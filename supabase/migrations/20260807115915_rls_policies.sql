-- RLS Etkinleştirme
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Yardımcı fonksiyon: is_workspace_member
-- workspace_members üzerindeki policy'lerin kendi tablosuna
-- subquery ile referans vermesi PostgreSQL'de "infinite recursion
-- detected in policy" hatasına yol açar. SECURITY DEFINER fonksiyon,
-- tablo sahibi (postgres) olarak çalıştığından RLS'i bypass eder ve
-- bu döngüyü kırar. Tüm membership kontrolleri bu fonksiyon
-- üzerinden yapılır.
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
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO anon, authenticated, service_role;

-- =========================================================
-- workspaces
-- Üyelik zaten var olan workspace'lere erişim membership'e bağlı;
-- yeni workspace oluşturma (INSERT) her authenticated kullanıcıya açık
-- (createWorkspace server action'ı hemen ardından workspace_members'a
-- kendini ekler).
-- =========================================================
CREATE POLICY "members_can_select_workspace"
ON workspaces FOR SELECT
USING (is_workspace_member(id));

CREATE POLICY "authenticated_can_create_workspace"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "members_can_update_workspace"
ON workspaces FOR UPDATE
USING (is_workspace_member(id));

CREATE POLICY "members_can_delete_workspace"
ON workspaces FOR DELETE
USING (is_workspace_member(id));

-- =========================================================
-- workspace_members
-- Kullanıcı, kendisinin üye olduğu workspace'lerdeki tüm üyelik
-- kayıtlarını görebilir. Kendi üyelik kaydını ekleyebilir (workspace
-- oluşturma / invite code ile katılma) ve silebilir (workspace'ten
-- ayrılma).
-- =========================================================
CREATE POLICY "members_can_select_workspace_members"
ON workspace_members FOR SELECT
USING (is_workspace_member(workspace_id));

CREATE POLICY "user_can_insert_own_membership"
ON workspace_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_can_delete_own_membership"
ON workspace_members FOR DELETE
USING (user_id = auth.uid());

-- =========================================================
-- kanban_columns / ideas
-- Bölüm 6.A'daki standart desen: workspace_id üzerinden membership
-- kontrolü, tüm işlemler için eşit yetki.
-- =========================================================
CREATE POLICY "workspace_members_can_access_kanban_columns"
ON kanban_columns FOR ALL
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_can_access_ideas"
ON ideas FOR ALL
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- =========================================================
-- idea_versions / comments
-- idea_id üzerinden ideas.workspace_id'ye, oradan da membership'e join.
-- =========================================================
CREATE POLICY "workspace_members_can_access_idea_versions"
ON idea_versions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_versions.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_versions.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
);

CREATE POLICY "workspace_members_can_access_comments"
ON comments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = comments.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = comments.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
);

-- =========================================================
-- board_templates
-- Bölüm 4.D: sistem şablonları herkese açık okunur; kullanıcı
-- şablonları yalnızca sahibi tarafından görülür/yönetilir.
-- =========================================================
CREATE POLICY "anyone_can_select_system_or_own_templates"
ON board_templates FOR SELECT
TO authenticated
USING (is_system = true OR user_id = auth.uid());

CREATE POLICY "user_can_insert_own_template"
ON board_templates FOR INSERT
TO authenticated
WITH CHECK (is_system = false AND user_id = auth.uid());

CREATE POLICY "user_can_update_own_template"
ON board_templates FOR UPDATE
USING (is_system = false AND user_id = auth.uid());

CREATE POLICY "user_can_delete_own_template"
ON board_templates FOR DELETE
USING (is_system = false AND user_id = auth.uid());

-- =========================================================
-- notifications
-- user_id = auth.uid() direkt kontrolü (Bölüm 6.A). Bildirim
-- oluşturma (INSERT) uygulama katmanında service_role client'ı ile
-- yapılır (Bölüm 6.D, 7.B) ve RLS'i bypass eder; bu yüzden burada
-- INSERT policy tanımlanmaz.
-- =========================================================
CREATE POLICY "user_can_select_own_notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "user_can_update_own_notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());
