-- Uygulama turu durumunun saklanmasi.

BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tur1@test.local','x',now(),now(),now()),
 ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tur2@test.local','x',now(),now(),now());

CREATE OR REPLACE FUNCTION pg_temp.kullanici_ol(u text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', u, 'role', 'authenticated')::text);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000d1');

SELECT is(
  (SELECT count(*)::int FROM user_onboarding),
  0,
  'Yeni kullanicinin onboarding kaydi yok (tur kendiliginden acilacak)'
);

SELECT lives_ok(
  $$SELECT complete_product_tour(2)$$,
  'Kullanici turu tamamlandi olarak isaretleyebilir'
);

SELECT is(
  (SELECT completed_tour_version FROM user_onboarding WHERE user_id = auth.uid()),
  2,
  'Tamamlanan surum kaydedildi'
);

SELECT lives_ok($$SELECT complete_product_tour(1)$$, 'Eski surumle tekrar cagirmak hata vermez');

SELECT is(
  (SELECT completed_tour_version FROM user_onboarding WHERE user_id = auth.uid()),
  2,
  'Surum asla geriye gitmez (eski sekmedeki eski kod yeni turu sifirlayamaz)'
);

SELECT throws_ok(
  $$SELECT complete_product_tour(0)$$,
  NULL,
  'invalid_tour_version',
  'Gecersiz surum reddedilir'
);

SELECT throws_ok(
  $$INSERT INTO user_onboarding (user_id, completed_tour_version) VALUES ('00000000-0000-0000-0000-0000000000d2', 99)$$,
  '42501',
  NULL,
  'Istemci tabloya dogrudan YAZAMAZ (baskasi adina da kendi adina da)'
);

SELECT throws_ok(
  $$UPDATE user_onboarding SET user_id = '00000000-0000-0000-0000-0000000000d2'$$,
  '42501',
  NULL,
  'Istemci kendi satirini dogrudan GUNCELLEYEMEZ'
);

SELECT pg_temp.kullanici_ol('00000000-0000-0000-0000-0000000000d2');

SELECT is(
  (SELECT count(*)::int FROM user_onboarding),
  0,
  'Baska kullanicinin onboarding kaydi GORUNMEZ'
);

SELECT * FROM finish();
ROLLBACK;
