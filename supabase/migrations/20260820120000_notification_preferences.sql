-- Faz 16: Bildirim event registry + olay-tipi bazlı e-posta tercihleri.
-- Önceki tek global "email_notifications_enabled" (user_metadata) anahtarı
-- yerine, her olay tipi (mention/atama/yorum/kart taşıma/workspace katılımı)
-- için ayrı ayrı açık/kapalı seçilebilen bir tercih modeline geçiliyor.

-- =========================================================
-- 1) notifications.type — olay tipi ayrımı (registry ile eşleşir).
-- Mevcut satırlar migration öncesi oluştuğu için tip bilgisi yok; geriye
-- dönük veri kaybı olmasın diye 'legacy' ile doldurulup sonra NOT NULL
-- zorunluluğu (default olmadan) bırakılıyor. Yeni insert'ler her zaman
-- gerçek tipi geçirir.
-- =========================================================
ALTER TABLE notifications ADD COLUMN type text NOT NULL DEFAULT 'legacy';
ALTER TABLE notifications ALTER COLUMN type DROP DEFAULT;

-- =========================================================
-- 2) notification_preferences — kullanıcı × olay tipi başına e-posta
-- tercihi. Satır yoksa "tercih belirtilmemiş" demektir; kod tarafındaki
-- registry'nin defaultEmailEnabled'ı geçerli olur (her kullanıcı için her
-- olay tipine satır seed etmeye gerek yok).
-- =========================================================
CREATE TABLE notification_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  email_enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, event_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_select_own_notification_preferences"
ON notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_can_upsert_own_notification_preferences"
ON notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_notification_preferences"
ON notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- =========================================================
-- 3) Geriye dönük uyumluluk: eski global tercihi (user_metadata.
-- email_notifications_enabled = false) kapatmış kullanıcılar için, o
-- tercihi e-posta gönderebilen tüm olay tiplerine "kapalı" satırı olarak
-- taşıyoruz — aksi halde bu kullanıcılar migration sonrası varsayılan
-- (çoğu tip için açık) tercihlerle aniden e-posta almaya başlardı.
-- =========================================================
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN
    SELECT id FROM auth.users
    WHERE raw_user_meta_data->>'email_notifications_enabled' = 'false'
  LOOP
    INSERT INTO notification_preferences (user_id, event_type, email_enabled)
    VALUES
      (u.id, 'mention', false),
      (u.id, 'idea_assigned', false),
      (u.id, 'comment_added', false),
      (u.id, 'idea_moved', false),
      (u.id, 'workspace_joined', false)
    ON CONFLICT (user_id, event_type) DO NOTHING;
  END LOOP;
END $$;
