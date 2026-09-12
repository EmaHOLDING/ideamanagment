-- Fikir versiyonlama: current_version_id isaretcisinin dogru tutulmasi ve
-- RPC imzalarinin tek kalmasi.
--
-- Ikinci kisim, bu projede IKI KEZ yasanmis bir hataya karsi: create_idea
-- veya update_idea'yi CREATE OR REPLACE ile yeniden yazarken _content
-- parametresinin tipini yanlis yazmak (text yerine jsonb), fonksiyonu
-- degistirmek yerine IKINCI bir overload olusturuyor. PostgREST o andan
-- itibaren "en iyi adayi secemiyorum" (PGRST203) diyor ve fikir
-- olusturma/duzenleme tamamen kiriliyor. Statik kontroller bunu
-- yakalamaz, yalnizca calisma zamaninda gorunur.

BEGIN;
SELECT plan(8);

-- ============================================================
-- RPC imzalari tek mi?
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM pg_proc WHERE proname = 'create_idea'),
  1,
  'create_idea tek surumlu (overload yok -> PGRST203 riski yok)'
);

SELECT is(
  (SELECT count(*)::int FROM pg_proc WHERE proname = 'update_idea'),
  1,
  'update_idea tek surumlu (overload yok -> PGRST203 riski yok)'
);

SELECT is(
  (SELECT pg_get_function_identity_arguments(oid) FROM pg_proc WHERE proname = 'create_idea'),
  '_workspace_id uuid, _column_id uuid, _title character varying, _content text, _problem_statement text, _target_audience text, _impact_score impact_effort_level, _effort_score impact_effort_level',
  'create_idea imzasinda _content TEXT (jsonb degil)'
);

-- ============================================================
-- current_version_id gercekten guncel versiyonu gosteriyor mu?
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','yazar@test.local','x',now(),now(),now());
INSERT INTO workspaces (id, title) VALUES ('00000000-0000-0000-0000-00000000c001','WS');
INSERT INTO workspace_members (workspace_id, user_id, role, status) VALUES
 ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000c1','OWNER','ACTIVE');
INSERT INTO kanban_columns (id, workspace_id, title, status_type, "order") VALUES
 ('00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000c001','Kolon','DRAFT',0);

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
SET LOCAL ROLE authenticated;

-- DIKKAT: `SELECT (fonksiyon()).*` Postgres'te fonksiyonu HER CIKTI
-- KOLONU icin yeniden calistirir. Composite sonucu tek bir kolonda
-- saklayip alanlara (kayit).alan ile eriserek tek cagri garanti ediliyor.
CREATE TEMP TABLE t_fikir AS
SELECT create_idea(
  '00000000-0000-0000-0000-00000000c001',
  '00000000-0000-0000-0000-00000000e001',
  'Ilk baslik',
  'ilk icerik'
) AS kayit;

SELECT is(
  (SELECT v.title FROM t_fikir f JOIN idea_versions v ON v.id = (f.kayit).current_version_id),
  'Ilk baslik',
  'create_idea sonrasi current_version_id ilk versiyonu gosteriyor'
);

SELECT is(
  (SELECT (kayit).current_version FROM t_fikir),
  1,
  'create_idea sonrasi current_version = 1'
);

CREATE TEMP TABLE t_guncel AS
SELECT update_idea(
  (SELECT (kayit).id FROM t_fikir),
  'Ikinci baslik',
  'ikinci icerik'
) AS kayit;

SELECT is(
  (SELECT v.title FROM t_guncel g JOIN idea_versions v ON v.id = (g.kayit).current_version_id),
  'Ikinci baslik',
  'update_idea sonrasi current_version_id YENI versiyonu gosteriyor'
);

SELECT is(
  (SELECT (kayit).current_version FROM t_guncel),
  2,
  'update_idea sonrasi current_version = 2'
);

-- Eski versiyon silinmemeli (gecmis korunuyor).
SELECT is(
  (SELECT count(*)::int FROM idea_versions WHERE idea_id = (SELECT (kayit).id FROM t_fikir)),
  2,
  'Eski versiyon korunuyor (gecmis silinmiyor)'
);

SELECT * FROM finish();
ROLLBACK;
