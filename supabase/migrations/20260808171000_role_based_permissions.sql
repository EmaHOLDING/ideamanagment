-- Faz 8: Genişletilmiş roller (Admin, Viewer) + içerik sahipliği kuralları.
--
-- Roller: OWNER (kurucu, tam yetki) / ADMIN (Owner'ın günlük yönetim
-- yükünü paylaşır, workspace'i silemez/devredemez) / MEMBER (kendi
-- oluşturduğu fikir/yorumu yönetir, board yapısına dokunamaz) / VIEWER
-- (tamamen salt-okunur, hiçbir yazma aksiyonu yapamaz).
--
-- İçerik sahipliği: bir fikri/yorumu sadece kendi oluşturan kişi VEYA
-- Owner/Admin düzenleyip silebilir — TEK İSTİSNA: yorum DÜZENLEME,
-- Owner/Admin dahil hiç kimseye başkasının yorumu için açık değil
-- (sadece silme için Owner/Admin istisnası var).

-- =========================================================
-- workspaces.default_invite_role: davetle katılan yeni üyenin
-- başlangıç rolü artık sabit MEMBER değil, Owner'ın seçtiği bir ayar.
-- =========================================================
ALTER TABLE workspaces ADD COLUMN default_invite_role workspace_role NOT NULL DEFAULT 'MEMBER';

-- Yorum düzenlemesini UI'da işaretlemek için.
ALTER TABLE comments ADD COLUMN updated_at timestamptz NULL;

-- =========================================================
-- Yardımcı fonksiyonlar (is_workspace_owner ile aynı desen).
-- =========================================================
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
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_owner_or_admin(uuid) TO anon, authenticated, service_role;

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
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_contributor(uuid) TO anon, authenticated, service_role;

-- =========================================================
-- join_workspace_by_invite_code: artık sabit MEMBER yerine
-- workspace'in default_invite_role'üyle katılır.
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

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (target_workspace.id, auth.uid(), target_workspace.default_invite_role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN target_workspace;
END;
$$;

-- =========================================================
-- update_idea: idea_versions'a yeni snapshot yazmadan ÖNCE açık bir
-- yetki kontrolü eklenir. Bu RPC SECURITY DEFINER DEĞİL (invoker
-- güvenliğiyle çalışır), bu yüzden ideas tablosundaki UPDATE RLS'sine
-- güvenmek tek başına yetmez: RLS reddettiğinde UPDATE sessizce 0 satır
-- etkiler ama idea_versions INSERT'i (member-geniş RLS'e sahip) zaten
-- gerçekleşmiş olurdu — tutarsız bir versiyon kaydı bırakırdı.
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_idea(
  _idea_id uuid,
  _title varchar,
  _content jsonb,
  _problem_statement text DEFAULT NULL,
  _target_audience text DEFAULT NULL,
  _impact_score impact_effort_level DEFAULT 'MEDIUM',
  _effort_score impact_effort_level DEFAULT 'MEDIUM'
)
RETURNS ideas
LANGUAGE plpgsql
AS $$
DECLARE
  updated_idea ideas;
  next_version int;
  v_created_by uuid;
  v_workspace_id uuid;
BEGIN
  SELECT current_version + 1, created_by, workspace_id
  INTO next_version, v_created_by, v_workspace_id
  FROM ideas WHERE id = _idea_id
  FOR UPDATE;

  IF next_version IS NULL THEN
    RAISE EXCEPTION 'idea not found or access denied';
  END IF;

  IF v_created_by IS DISTINCT FROM auth.uid() AND NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the creator, owner, or admin can edit this idea';
  END IF;

  INSERT INTO idea_versions (
    idea_id, version_number, title, content,
    problem_statement, target_audience, impact_score, effort_score, created_by
  )
  VALUES (
    _idea_id, next_version, _title, _content,
    _problem_statement, _target_audience, _impact_score, _effort_score, auth.uid()
  );

  UPDATE ideas
  SET current_version = next_version, updated_at = timezone('utc'::text, now())
  WHERE id = _idea_id
  RETURNING * INTO updated_idea;

  RETURN updated_idea;
END;
$$;

-- =========================================================
-- kanban_columns: owner-only yerine owner-veya-admin.
-- =========================================================
DROP POLICY IF EXISTS "owners_can_insert_kanban_columns" ON kanban_columns;
DROP POLICY IF EXISTS "owners_can_update_kanban_columns" ON kanban_columns;
DROP POLICY IF EXISTS "owners_can_delete_kanban_columns" ON kanban_columns;

CREATE POLICY "managers_can_insert_kanban_columns"
ON kanban_columns FOR INSERT
WITH CHECK (is_workspace_owner_or_admin(workspace_id));

CREATE POLICY "managers_can_update_kanban_columns"
ON kanban_columns FOR UPDATE
USING (is_workspace_owner_or_admin(workspace_id))
WITH CHECK (is_workspace_owner_or_admin(workspace_id));

CREATE POLICY "managers_can_delete_kanban_columns"
ON kanban_columns FOR DELETE
USING (is_workspace_owner_or_admin(workspace_id));

-- =========================================================
-- ideas: tek FOR ALL politikası dörde bölünüyor.
-- =========================================================
DROP POLICY IF EXISTS "workspace_members_can_access_ideas" ON ideas;

CREATE POLICY "members_can_select_ideas"
ON ideas FOR SELECT
USING (is_workspace_member(workspace_id));

CREATE POLICY "contributors_can_insert_ideas"
ON ideas FOR INSERT
WITH CHECK (is_workspace_contributor(workspace_id));

CREATE POLICY "owners_creators_can_update_ideas"
ON ideas FOR UPDATE
USING (created_by = auth.uid() OR is_workspace_owner_or_admin(workspace_id))
WITH CHECK (created_by = auth.uid() OR is_workspace_owner_or_admin(workspace_id));

CREATE POLICY "owners_creators_can_delete_ideas"
ON ideas FOR DELETE
USING (created_by = auth.uid() OR is_workspace_owner_or_admin(workspace_id));

-- =========================================================
-- comments: SELECT/INSERT idea_id-join deseniyle member/contributor;
-- UPDATE sadece yazarın kendisi (Owner/Admin istisnası YOK — "başkasının
-- yorumunu düzenleme" hiç kimseye açık değil); DELETE yazar VEYA
-- Owner/Admin.
-- =========================================================
DROP POLICY IF EXISTS "workspace_members_can_access_comments" ON comments;

CREATE POLICY "members_can_select_comments"
ON comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = comments.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
);

CREATE POLICY "contributors_can_insert_comments"
ON comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = comments.idea_id
    AND is_workspace_contributor(ideas.workspace_id)
  )
);

CREATE POLICY "authors_can_update_own_comments"
ON comments FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "authors_or_managers_can_delete_comments"
ON comments FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = comments.idea_id
    AND is_workspace_owner_or_admin(ideas.workspace_id)
  )
);

-- =========================================================
-- idea_votes / idea_tags / tags: SELECT member, INSERT/DELETE
-- contributor (Viewer oy veremez/etiket ekleyemez).
-- =========================================================
DROP POLICY IF EXISTS "workspace_members_can_access_idea_votes" ON idea_votes;

CREATE POLICY "members_can_select_idea_votes"
ON idea_votes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_votes.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
);

CREATE POLICY "contributors_can_insert_idea_votes"
ON idea_votes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_votes.idea_id
    AND is_workspace_contributor(ideas.workspace_id)
  )
);

CREATE POLICY "contributors_can_delete_idea_votes"
ON idea_votes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_votes.idea_id
    AND is_workspace_contributor(ideas.workspace_id)
  )
);

DROP POLICY IF EXISTS "workspace_members_can_access_idea_tags" ON idea_tags;

CREATE POLICY "members_can_select_idea_tags"
ON idea_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_tags.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
);

CREATE POLICY "contributors_can_insert_idea_tags"
ON idea_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_tags.idea_id
    AND is_workspace_contributor(ideas.workspace_id)
  )
);

CREATE POLICY "contributors_can_delete_idea_tags"
ON idea_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_tags.idea_id
    AND is_workspace_contributor(ideas.workspace_id)
  )
);

DROP POLICY IF EXISTS "workspace_members_can_access_tags" ON tags;

CREATE POLICY "members_can_select_tags"
ON tags FOR SELECT
USING (is_workspace_member(workspace_id));

CREATE POLICY "contributors_can_insert_tags"
ON tags FOR INSERT
WITH CHECK (is_workspace_contributor(workspace_id));

CREATE POLICY "contributors_can_delete_tags"
ON tags FOR DELETE
USING (is_workspace_contributor(workspace_id));

-- =========================================================
-- workspace_members: Owner+Admin, OWNER olmayan üyelerin rolünü
-- değiştirebilir (Owner ataması/değişimi SADECE
-- transfer_workspace_ownership RPC'siyle olur, bu genel UPDATE
-- yolundan asla — hem USING hem WITH CHECK'te 'OWNER' engellenir).
-- Üye çıkarma da Owner+Admin'e genişletilir.
-- =========================================================
CREATE POLICY "managers_can_update_member_roles"
ON workspace_members FOR UPDATE
USING (is_workspace_owner_or_admin(workspace_id) AND role <> 'OWNER')
WITH CHECK (role <> 'OWNER');

DROP POLICY IF EXISTS "owners_can_remove_members" ON workspace_members;

CREATE POLICY "managers_can_remove_members"
ON workspace_members FOR DELETE
USING (is_workspace_owner_or_admin(workspace_id));
