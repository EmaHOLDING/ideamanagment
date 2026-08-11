-- Rate limiting: sabit pencereli (fixed-window) sayaç, tek atomik UPSERT ile
-- race condition olmadan artırılıp kontrol ediliyor. Redis/Upstash gibi
-- harici bir servise ihtiyaç duymadan mevcut Postgres bağlantısını
-- kullanıyor — bu projede zaten her server action'da sıcak bir Supabase
-- bağlantısı var, ek altyapı/kayıt gerekmiyor.
--
-- Tablo doğrudan erişilemez (RLS aktif, hiçbir policy yok) — sadece
-- SECURITY DEFINER check_rate_limit() fonksiyonu üzerinden okunup
-- yazılabiliyor, diğer SECURITY DEFINER RPC'lerle (soft_delete_comment vb.)
-- aynı desen.

CREATE TABLE rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  count int NOT NULL DEFAULT 1
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _max_count int,
  _window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  -- now()/timezone(...,now()) bir transaction boyunca SABİT kalır
  -- (transaction start time) — bir işlem uzun sürerse veya aynı
  -- transaction içinde art arda çağrılırsa yanlış sonuç verir.
  -- clock_timestamp() her çağrıda gerçek duvar saatini döner.
  v_now timestamptz := clock_timestamp();
BEGIN
  INSERT INTO rate_limits (key, window_start, count)
  VALUES (_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rate_limits.window_start < v_now - make_interval(secs => _window_seconds)
        THEN 1
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < v_now - make_interval(secs => _window_seconds)
        THEN v_now
      ELSE rate_limits.window_start
    END
  RETURNING count INTO v_count;

  RETURN v_count <= _max_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO authenticated;
