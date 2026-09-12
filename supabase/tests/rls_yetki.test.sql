-- Yetki modelinin regresyon testleri (pgTAP).
--
-- Bu dosya, 2026-09-12 guvenlik denetiminde elle kosturulan senaryolarin
-- kalici halidir. Uygulamanin yetki siniri RLS'tir (anon key tarayicida
-- oldugu icin istemci PostgREST'e dogrudan da konusabilir), yani buradaki
-- her "engellendi" satiri gercek bir saldiri yuzeyini kapatiyor.
--
-- Calistirmak icin:  npm run test:db
--
-- Not: Testler tek bir transaction icinde kosar ve sonunda geri alinir;
-- veritabaninda iz birakmaz.

BEGIN;
SELECT plan(21);

-- ============================================================
-- Sahne: iki workspace, dort kullanici
--   A: kurban workspace  (b1=OWNER, b2=MEMBER, b3=VIEWER)
--   B: saldirgan workspace (b4=OWNER, b2=MEMBER)
-- ============================================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner@test.local','x',now(),now(),now()),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','member@test.local','x',now(),now(),now()),
 ('00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','viewer@test.local','x',now(),now(),now()),
 ('00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','outsider@test.local','x',now(),now(),now());

INSERT INTO workspaces (id, title, invite_code) VALUES
 ('00000000-0000-0000-0000-00000000c001','Kurban WS','testkod001'),
 ('00000000-0000-0000-0000-00000000c002','Saldirgan WS','testkod002');

INSERT INTO workspace_members (workspace_id, user_id, role, status) VALUES
 ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b1','OWNER','ACTIVE'),
 ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b2','MEMBER','ACTIVE'),
 ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b3','VIEWER','ACTIVE'),
 ('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-0000000000b4','OWNER','ACTIVE'),
 ('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-0000000000b2','MEMBER','ACTIVE');

INSERT INTO kanban_columns (id, workspace_id, title, status_type, "order") VALUES
 ('00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000c001','A-Kolon','DRAFT',0),
 ('00000000-0000-0000-0000-00000000e002','00000000-0000-0000-0000-00000000c002','B-Kolon','DRAFT',0);

INSERT INTO projects (id, workspace_id, name, created_by) VALUES
 ('00000000-0000-0000-0000-00000000d001','00000000-0000-0000-0000-00000000c001','Gizli Proje','00000000-0000-0000-0000-0000000000b1');

INSERT INTO ideas (id, workspace_id, column_id, created_by) VALUES
 ('00000000-0000-0000-0000-00000000f001','00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-0000000000b1'),
 ('00000000-0000-0000-0000-00000000f002','00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-0000000000b2');

-- Belirtilen kullanici kimligiyle konusmaya gecer.
CREATE OR REPLACE FUNCTION pg_temp.kullanici_ol(u text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', u, 'role', 'authenticated')::text);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

-- ============================================================
-- KRITIK: workspace ele gecirme
-- ============================================================
SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000b4');

SELECT throws_ok(
  $$INSERT INTO workspace_members (workspace_id, user_id, role, status)
    VALUES ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b4','OWNER','ACTIVE')$$,
  '42501',
  NULL,
  'Disaridan biri kendini kurban workspace e OWNER olarak EKLEYEMEZ'
);

SELECT ok(
  NOT is_workspace_owner('00000000-0000-0000-0000-00000000c001'),
  'Disaridaki kullanici kurban workspace te owner DEGIL'
);

SELECT is(
  (SELECT count(*)::int FROM ideas WHERE workspace_id='00000000-0000-0000-0000-00000000c001'),
  0,
  'Uye olmayan kullanici kurban workspace in fikirlerini GOREMEZ'
);

-- Cikarilmis uye senaryosu: workspace UUID sini biliyor ama geri giremiyor
SELECT throws_ok(
  $$INSERT INTO workspace_members (workspace_id, user_id, role, status)
    VALUES ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b4','MEMBER','ACTIVE')$$,
  '42501',
  NULL,
  'Cikarilmis uye kendini MEMBER olarak da geri EKLEYEMEZ'
);

-- ============================================================
-- YUKSEK: caprazworkspace yetki yukseltme
-- ============================================================
SELECT throws_ok(
  $$UPDATE workspace_members
       SET workspace_id='00000000-0000-0000-0000-00000000c001',
           user_id='00000000-0000-0000-0000-0000000000b4',
           role='ADMIN'
     WHERE workspace_id='00000000-0000-0000-0000-00000000c002'
       AND user_id='00000000-0000-0000-0000-0000000000b2'$$,
  '42501',
  NULL,
  'Kendi workspace inin owner i, uyelik satirini BASKA workspace e tasiyamaz'
);

-- ============================================================
-- ORTA: MEMBER, owner-only RPC lerini duz UPDATE ile atlayamaz
-- ============================================================
SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000b2');

SELECT throws_ok(
  $$SELECT soft_delete_project('00000000-0000-0000-0000-00000000d001')$$,
  NULL,
  'permission_denied: only workspace managers can delete a project',
  'MEMBER, projeyi RPC ile silemez'
);

SELECT throws_ok(
  $$UPDATE projects SET archived_at = now() WHERE id='00000000-0000-0000-0000-00000000d001'$$,
  '42501',
  NULL,
  'MEMBER, duz UPDATE ile projeyi ARSIVLEYEMEZ (RPC kontrolu atlanamaz)'
);

SELECT throws_ok(
  $$UPDATE projects SET deleted_at = now() WHERE id='00000000-0000-0000-0000-00000000d001'$$,
  '42501',
  NULL,
  'MEMBER, duz UPDATE ile projeyi SILEMEZ'
);

SELECT throws_ok(
  $$UPDATE ideas SET workspace_id='00000000-0000-0000-0000-00000000c002' WHERE id='00000000-0000-0000-0000-00000000f002'$$,
  '42501',
  NULL,
  'Fikri olusturan kisi bile fikri BASKA workspace e tasiyamaz'
);

SELECT throws_ok(
  $$SELECT move_idea('00000000-0000-0000-0000-00000000f002','00000000-0000-0000-0000-00000000e002')$$,
  NULL,
  'column_not_in_workspace',
  'Fikir, baska workspace in koluna TASINAMAZ'
);

SELECT is(
  (SELECT count(*)::int FROM ideas WHERE id='00000000-0000-0000-0000-00000000f001' AND deleted_at IS NOT NULL),
  0,
  'MEMBER, baskasinin fikrini silemedi'
);

-- ============================================================
-- VIEWER hicbir sey yazamaz
-- ============================================================
SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000b3');

SELECT is(
  (SELECT count(*)::int FROM projects WHERE id='00000000-0000-0000-0000-00000000d001' AND name='VIEWER YAZDI'),
  0,
  'VIEWER proje adini degistiremez'
);

SELECT throws_ok(
  $$INSERT INTO ideas (workspace_id, column_id, created_by)
    VALUES ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-0000000000b3')$$,
  '42501',
  NULL,
  'VIEWER yeni fikir EKLEYEMEZ'
);

SELECT ok(
  NOT is_workspace_contributor('00000000-0000-0000-0000-00000000c001'),
  'VIEWER contributor sayilmaz'
);

-- ============================================================
-- MESRU AKISLAR: sertlestirme normal kullanimi kirmadi mi?
-- ============================================================
SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000b2');

SELECT lives_ok(
  $$SELECT move_idea('00000000-0000-0000-0000-00000000f002','00000000-0000-0000-0000-00000000e001')$$,
  'MESRU: contributor fikri kendi workspace i icinde tasiyabilir'
);

SELECT lives_ok(
  $$UPDATE projects SET name='Yeni Ad', color='rose' WHERE id='00000000-0000-0000-0000-00000000d001'$$,
  'MESRU: contributor proje icerigini duzenleyebilir'
);

SELECT is(
  (SELECT (update_idea('00000000-0000-0000-0000-00000000f002','Baslik','icerik')).current_version),
  2,
  'MESRU: update_idea yeni versiyon yazabiliyor'
);

SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000b1');

SELECT lives_ok(
  $$UPDATE workspace_members SET role='ADMIN'
     WHERE workspace_id='00000000-0000-0000-0000-00000000c001'
       AND user_id='00000000-0000-0000-0000-0000000000b2'$$,
  'MESRU: owner uye rolunu degistirebilir'
);

SELECT ok(
  (archive_project('00000000-0000-0000-0000-00000000d001')).archived_at IS NOT NULL,
  'MESRU: owner projeyi RPC ile arsivleyebilir'
);

SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000b4');

SELECT is(
  (SELECT (join_workspace_by_invite_code('testkod001')).title),
  'Kurban WS',
  'MESRU: davet koduyla katilma calisiyor'
);

SELECT is(
  (SELECT status::text FROM workspace_members
    WHERE workspace_id='00000000-0000-0000-0000-00000000c001'
      AND user_id='00000000-0000-0000-0000-0000000000b4'),
  'PENDING',
  'MESRU: davetle katilan kisi ACTIVE degil PENDING olur'
);

SELECT * FROM finish();
ROLLBACK;
