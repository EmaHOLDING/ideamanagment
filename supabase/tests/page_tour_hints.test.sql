-- Sayfa turu ipucunun (parlayan "?" butonu) her sayfa icin bir kez
-- gosterilmesi.

BEGIN;
SELECT plan(7);

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ipucu@test.local','x',now(),now(),now());

SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
SET LOCAL ROLE authenticated;

SELECT lives_ok($$SELECT mark_page_tour_hint_seen('workspaces')$$, 'Ipucu goruldu olarak isaretlenebilir');

SELECT is(
  (SELECT seen_page_tour_hints FROM user_onboarding WHERE user_id = auth.uid()),
  ARRAY['workspaces'],
  'Sayfa kimligi kaydedildi'
);

SELECT is(
  (SELECT completed_tour_version FROM user_onboarding WHERE user_id = auth.uid()),
  0,
  'Ipucu kaydi, genel turu tamamlanmis SAYMAZ (genel tur yine acilir)'
);

SELECT lives_ok($$SELECT mark_page_tour_hint_seen('workspaces')$$, 'Ayni sayfayi tekrar isaretlemek hata vermez');
SELECT lives_ok($$SELECT mark_page_tour_hint_seen('board')$$, 'Ikinci sayfa eklenebilir');

SELECT is(
  (SELECT seen_page_tour_hints FROM user_onboarding WHERE user_id = auth.uid()),
  ARRAY['workspaces', 'board'],
  'Ayni sayfa iki kez eklenmez, yeni sayfa sona eklenir'
);

SELECT throws_ok(
  $$SELECT mark_page_tour_hint_seen('<script>')$$,
  NULL,
  'invalid_page_id',
  'Bicime uymayan sayfa kimligi reddedilir'
);

SELECT * FROM finish();
ROLLBACK;
