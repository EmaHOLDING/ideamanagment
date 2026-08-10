-- Faz 12: Akıllı E-Posta Bildirimleri. Bir kullanıcının "çevrimiçi" olup
-- olmadığını (uygulama içinde e-posta göndermeme kararı için) belirlemek
-- amacıyla hafif bir heartbeat tablosu. Kullanıcıya görünen bir "kim
-- çevrimiçi" özelliği DEĞİL — sadece sunucu tarafında sessizce kullanılan
-- bir zaman damgası.
CREATE TABLE user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- E-posta karar mantığı service-role (admin) client ile çalışıp RLS'i
-- bypass eder ve herhangi bir kullanıcının presence'ını okuyabilir; bu
-- politikalar sadece normal kullanıcı client'ının KENDİ satırını
-- upsert edebilmesini sağlıyor (heartbeat çağrısı için).
CREATE POLICY "users_can_select_own_presence"
ON user_presence FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_presence"
ON user_presence FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_presence"
ON user_presence FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
