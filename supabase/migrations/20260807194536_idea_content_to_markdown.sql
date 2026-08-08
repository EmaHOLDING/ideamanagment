-- idea_versions.content artık Tiptap JSON doküman formatı yerine
-- düz Markdown metni olarak saklanır (bkz. @tiptap/markdown entegrasyonu,
-- .md dosyası içe aktarma özelliği). Bu proje henüz prod'a hiç push
-- edilmediği için (dev-only yerel veri) veri kaybı endişesi yok.

ALTER TABLE idea_versions ALTER COLUMN content TYPE text USING content::text;

-- create_idea/update_idea fonksiyonlarının _content parametresi jsonb'den
-- text'e değişiyor. Postgres'te parametre tipi değişikliği CREATE OR REPLACE
-- ile yapılamaz (farklı imza sayılır), bu yüzden önce eski jsonb imzalı
-- fonksiyonlar silinir, sonra text parametresiyle yeniden oluşturulur.

DROP FUNCTION IF EXISTS public.create_idea(uuid, uuid, varchar, jsonb, text, text, impact_effort_level, impact_effort_level);
DROP FUNCTION IF EXISTS public.update_idea(uuid, varchar, jsonb, text, text, impact_effort_level, impact_effort_level);

CREATE FUNCTION public.create_idea(
  _workspace_id uuid,
  _column_id uuid,
  _title varchar,
  _content text,
  _problem_statement text DEFAULT NULL,
  _target_audience text DEFAULT NULL,
  _impact_score impact_effort_level DEFAULT 'MEDIUM',
  _effort_score impact_effort_level DEFAULT 'MEDIUM'
)
RETURNS ideas
LANGUAGE plpgsql
AS $$
DECLARE
  new_idea ideas;
BEGIN
  INSERT INTO ideas (workspace_id, column_id, current_version, created_by)
  VALUES (_workspace_id, _column_id, 1, auth.uid())
  RETURNING * INTO new_idea;

  INSERT INTO idea_versions (
    idea_id, version_number, title, content,
    problem_statement, target_audience, impact_score, effort_score, created_by
  )
  VALUES (
    new_idea.id, 1, _title, _content,
    _problem_statement, _target_audience, _impact_score, _effort_score, auth.uid()
  );

  RETURN new_idea;
END;
$$;

CREATE FUNCTION public.update_idea(
  _idea_id uuid,
  _title varchar,
  _content text,
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
BEGIN
  SELECT current_version + 1 INTO next_version
  FROM ideas WHERE id = _idea_id
  FOR UPDATE;

  IF next_version IS NULL THEN
    RAISE EXCEPTION 'idea not found or access denied';
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

GRANT EXECUTE ON FUNCTION public.create_idea(uuid, uuid, varchar, text, text, text, impact_effort_level, impact_effort_level) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_idea(uuid, varchar, text, text, text, impact_effort_level, impact_effort_level) TO authenticated;
