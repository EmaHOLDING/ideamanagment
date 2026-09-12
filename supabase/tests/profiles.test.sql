-- profiles tablosunun gorunurlugu ve senkronizasyonu.
--
-- Bu tablo e-posta adresi tuttugu icin gorunurluk kurali yanlis olursa
-- dogrudan bir veri sizintisi olur: rastgele bir kullanici tum kullanici
-- tabanini cekip e-posta toplayabilir. Kural: kendi profilin + seninle
-- EN AZ BIR workspace'i paylasan ACTIVE kisilerin profili.

BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data) VALUES
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ayse@test.local','x',now(),now(),now(),'{"full_name":"Ayse Yilmaz"}'),
 ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','burak@test.local','x',now(),now(),now(),'{"full_name":"Burak Demir"}'),
 -- Ayni workspace'te ama daveti kabul etmemis (PENDING)
 ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cem@test.local','x',now(),now(),now(),'{"full_name":"Cem Kaya"}'),
 -- Hicbir ortak workspace'i olmayan yabanci
 ('00000000-0000-0000-0000-0000000000a4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','yabanci@test.local','x',now(),now(),now(),'{"first_name":"Yabanci","last_name":"Kisi"}');

-- ============================================================
-- Trigger, auth.users'a yazilani profiles'a yansitti mi?
-- ============================================================
SELECT is(
  (SELECT full_name FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a1'),
  'Ayse Yilmaz',
  'Trigger yeni kullanici icin profil olusturdu (full_name)'
);

SELECT is(
  (SELECT full_name FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a4'),
  'Yabanci Kisi',
  'Ad cozumlemesi first_name + last_name birlesimini de destekliyor'
);

SELECT is(
  (SELECT email FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a2'),
  'burak@test.local',
  'E-posta profiles a yansidi'
);

UPDATE auth.users SET raw_user_meta_data = '{"full_name":"Ayse Y."}'
 WHERE id='00000000-0000-0000-0000-0000000000a1';

SELECT is(
  (SELECT full_name FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a1'),
  'Ayse Y.',
  'Isim degisikligi profiles a senkronlandi'
);

-- ============================================================
-- Gorunurluk
-- ============================================================
INSERT INTO workspaces (id, title) VALUES ('00000000-0000-0000-0000-00000000c001','Ortak WS');
INSERT INTO workspace_members (workspace_id, user_id, role, status) VALUES
 ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000a1','OWNER','ACTIVE'),
 ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000a2','MEMBER','ACTIVE'),
 ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000a3','MEMBER','PENDING');

CREATE OR REPLACE FUNCTION pg_temp.kullanici_ol(u text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', u, 'role', 'authenticated')::text);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000a1');

SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a1'),
  1,
  'Kullanici kendi profilini gorebilir'
);

SELECT is(
  (SELECT full_name FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a2'),
  'Burak Demir',
  'Ayni workspace teki ACTIVE uyenin profili gorulebilir'
);

SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a3'),
  0,
  'PENDING uyenin profili GORUNMEZ'
);

SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a4'),
  0,
  'Ortak workspace i olmayan kisinin profili GORUNMEZ (e-posta toplama engellendi)'
);

-- ============================================================
-- Cikarilmis uyenin gecmis icerigi: adi gorunmeye devam etmeli
-- ============================================================
RESET ROLE;

INSERT INTO kanban_columns (id, workspace_id, title, status_type, "order") VALUES
 ('00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-00000000c001','Kolon','DRAFT',0);
INSERT INTO ideas (id, workspace_id, column_id, created_by) VALUES
 ('00000000-0000-0000-0000-00000000f001','00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000e001','00000000-0000-0000-0000-0000000000a1');
INSERT INTO comments (id, idea_id, user_id, content) VALUES
 ('00000000-0000-0000-0000-000000009001','00000000-0000-0000-0000-00000000f001','00000000-0000-0000-0000-0000000000a2','eski yorum');

-- Burak workspace'ten cikariliyor; yorumu panoda kaliyor.
DELETE FROM workspace_members
 WHERE workspace_id='00000000-0000-0000-0000-00000000c001'
   AND user_id='00000000-0000-0000-0000-0000000000a2';

SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000a1');

SELECT is(
  (SELECT full_name FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a2'),
  'Burak Demir',
  'Cikarilmis uyenin adi, gecmis yorumunda hala cozulebiliyor'
);

SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id='00000000-0000-0000-0000-0000000000a4'),
  0,
  'Hicbir icerigi olmayan yabanci hala GORUNMEZ'
);

-- ============================================================
-- Yazma tamamen kapali olmali (senkron yalnizca trigger uzerinden)
-- ============================================================
SELECT throws_ok(
  $$UPDATE profiles SET email='saldirgan@evil.local' WHERE id='00000000-0000-0000-0000-0000000000a1'$$,
  '42501',
  NULL,
  'Kullanici kendi profilini bile dogrudan DEGISTIREMEZ'
);

SELECT * FROM finish();
ROLLBACK;
