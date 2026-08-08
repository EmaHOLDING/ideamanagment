-- Faz 6: Aktivite akışı. Kullanıcı kendi eylemini kendi adına loglar
-- (actor_id = auth.uid() kontrolü INSERT WITH CHECK'te), bu yüzden
-- admin client gerekmez.
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id uuid NULL REFERENCES ideas(id) ON DELETE SET NULL,
  type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_workspace_created ON activity_log (workspace_id, created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_select_activity_log"
ON activity_log FOR SELECT
USING (is_workspace_member(workspace_id));

CREATE POLICY "members_can_insert_own_activity_log"
ON activity_log FOR INSERT
WITH CHECK (actor_id = auth.uid() AND is_workspace_member(workspace_id));
