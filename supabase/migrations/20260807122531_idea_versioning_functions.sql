-- Bölüm 4.A (KRİTİK): fikir oluşturma/güncelleme, "ideas" ve
-- "idea_versions" tablolarına atomik olarak yazılmalı — biri yazılıp
-- diğeri yazılmazsa veri tutarsızlığı oluşur (current_version ile
-- idea_versions.version_number senkronizasyonu bozulur).
-- Postgres fonksiyonları çağıran işlemin transaction'ı içinde
-- çalıştığından bu iki INSERT/UPDATE'i atomik hale getirir.
-- SECURITY INVOKER (varsayılan): fonksiyon çağıran kullanıcının
-- rolüyle çalışır, dolayısıyla ideas/idea_versions tablolarındaki RLS
-- politikaları normal şekilde uygulanmaya devam eder.

CREATE OR REPLACE FUNCTION public.create_idea(
  _workspace_id uuid,
  _column_id uuid,
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

GRANT EXECUTE ON FUNCTION public.create_idea(uuid, uuid, varchar, jsonb, text, text, impact_effort_level, impact_effort_level) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_idea(uuid, varchar, jsonb, text, text, impact_effort_level, impact_effort_level) TO authenticated;
