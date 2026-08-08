-- Faz 6: Fikir oylaması. Bir kullanıcı bir fikre yalnızca bir kez oy
-- verebilir (toggle davranışı uygulama katmanında yapılır).
CREATE TABLE idea_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id, user_id)
);

ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;

-- idea_versions/comments ile aynı desen — idea_id üzerinden
-- ideas.workspace_id'ye, oradan da membership'e join.
CREATE POLICY "workspace_members_can_access_idea_votes"
ON idea_votes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_votes.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ideas
    WHERE ideas.id = idea_votes.idea_id
    AND is_workspace_member(ideas.workspace_id)
  )
);
