-- Faz 6: Workspace'e ait, tekrar kullanılabilir etiket havuzu.
-- Tüm üyeler etiket oluşturabilir/silebilir (yapısal değil, ortak kelime
-- dağarcığı) — kanban_columns'daki owner-only kısıtlaması burada yok.
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  color varchar(20) NOT NULL DEFAULT 'gray',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE idea_tags (
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, tag_id)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_access_tags"
ON tags FOR ALL
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- idea_tags: idea_versions/comments ile aynı desen — idea_id üzerinden
-- ideas.workspace_id'ye, oradan da membership'e join.
CREATE POLICY "workspace_members_can_access_idea_tags"
ON idea_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_tags.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_tags.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
);
