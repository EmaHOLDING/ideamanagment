-- ideas.current_version_id: guncel versiyona dogrudan isaret.
--
-- Sorun: "bir fikrin guncel basligi" almanin tek yolu, o fikrin TUM
-- versiyonlarini cekip uygulama tarafinda
-- `find(v => v.version_number === idea.current_version)` demekti. Bu kalip
-- kod tabaninda 10 ayri sorguda vardi; ikisi `idea_versions(*)` ile her
-- versiyonun markdown govdesini de indiriyordu. 100 fikir x ortalama 5
-- duzenleme = 100 satir yerine 500 satir, ve fikirler duzenlendikce bu
-- oran buyuyor.
--
-- current_version (int) uyumluluk icin KALIYOR (RPC'ler onu kullaniyor);
-- bu kolon onun yaninda, PostgREST'in tek satir embed edebilmesi icin bir
-- FK hedefi sagliyor.
ALTER TABLE ideas
  ADD COLUMN current_version_id uuid NULL REFERENCES idea_versions(id) ON DELETE SET NULL;

CREATE INDEX idx_ideas_current_version ON ideas(current_version_id);

-- Mevcut satirlari doldur.
UPDATE ideas i
SET current_version_id = v.id
FROM idea_versions v
WHERE v.idea_id = i.id
  AND v.version_number = i.current_version;

-- =========================================================
-- create_idea: versiyon eklendikten sonra isaretciyi de yazar.
-- (SECURITY DEFINER DEGIL -- mevcut davranis korunuyor.)
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_idea(
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
  new_version_id uuid;
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
  )
  RETURNING id INTO new_version_id;

  UPDATE ideas
  SET current_version_id = new_version_id
  WHERE id = new_idea.id
  RETURNING * INTO new_idea;

  RETURN new_idea;
END;
$$;

-- =========================================================
-- update_idea: yetki kontrolu aynen korunuyor (bu fonksiyon bilincli
-- olarak SECURITY DEFINER DEGIL; bkz. 20260808171000 migration'indaki not).
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_idea(
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
  new_version_id uuid;
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
  )
  RETURNING id INTO new_version_id;

  UPDATE ideas
  SET current_version = next_version,
      current_version_id = new_version_id,
      updated_at = timezone('utc'::text, now())
  WHERE id = _idea_id
  RETURNING * INTO updated_idea;

  RETURN updated_idea;
END;
$$;

-- update_idea invoker guvenligiyle calistigi icin, 20260912100000'de
-- daraltilan kolon bazli UPDATE yetkisine yeni kolon da eklenmeli.
GRANT UPDATE (current_version, current_version_id, updated_at) ON ideas TO authenticated;
