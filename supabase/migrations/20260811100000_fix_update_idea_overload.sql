-- =========================================================
-- Bug fix: 20260808171000_role_based_permissions.sql, update_idea'ya
-- yetki kontrolü eklerken yanlışlıkla _content parametresini tekrar
-- 'jsonb' olarak tanımlamıştı (Faz 5'te text'e çevrilmişti).
-- CREATE OR REPLACE, farklı imzalı bir fonksiyonu DEĞİŞTİRMEZ, YENİ bir
-- overload olarak ekler — bu yüzden veritabanında update_idea'nın hem
-- jsonb hem text parametreli iki ayrı sürümü aynı anda var olmuş,
-- PostgREST her çağrıda "en iyi adayı seçemiyorum" (PGRST203) hatası
-- vermeye başlamıştı (fikir düzenlemenin her zaman hata vermesinin
-- sebebi budur).
--
-- Düzeltme: hatalı jsonb imzalı sürüm DROP edilir, doğru text imzalı
-- sürüm (Faz 8'deki yetki kontrolüyle birlikte) tek sürüm olarak
-- yeniden oluşturulur.
-- =========================================================

DROP FUNCTION IF EXISTS public.update_idea(
  uuid, varchar, jsonb, text, text, impact_effort_level, impact_effort_level
);

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

GRANT EXECUTE ON FUNCTION public.update_idea(uuid, varchar, text, text, text, impact_effort_level, impact_effort_level) TO authenticated;
