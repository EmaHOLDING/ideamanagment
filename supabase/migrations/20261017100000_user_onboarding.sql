-- Uygulama turu: kullanicinin hangi tur surumunu tamamladigini tutar.
--
-- Tur ilk giriste bir kez kendiliginden acilir. "Gorudu" bilgisi tarayici
-- yerine burada tutuluyor ki kullanici yeni bir cihazdan girdiginde tur
-- tekrar acilmasin.
--
-- Boolean yerine surum numarasi tutuluyor: tura ileride yeni bir ozellik
-- adimi eklenip PRODUCT_TOUR_VERSION (lib/tour-steps.ts) arttirildiginda,
-- eski surumu tamamlamis herkese guncel tur bir kez daha gosterilebilir.

CREATE TABLE user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_tour_version integer NOT NULL DEFAULT 0,
  tour_completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Herkes yalnizca kendi satirini okur.
CREATE POLICY "kullanici_kendi_onboarding_satirini_okur"
ON user_onboarding FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Istemciden dogrudan yazma YOK: tek yazma yolu asagidaki RPC. Bu sayede
-- 20260912100000'de kapatilan turden "satiri degistirebilen, yetki tasiyan
-- kolonu da (user_id) yeniden yazabilir" acigi burada hic olusmuyor.
REVOKE INSERT, UPDATE, DELETE ON user_onboarding FROM authenticated;
REVOKE ALL ON user_onboarding FROM anon;

-- =========================================================
-- complete_product_tour: cagiranin kendi satirini olusturur/gunceller.
-- GREATEST ile surum asla geriye gitmez (eski bir sekmede kalmis eski
-- surum kodu, yeni turu "tamamlanmamis" durumuna dusuremez).
-- =========================================================
CREATE OR REPLACE FUNCTION public.complete_product_tour(_version integer)
RETURNS user_onboarding
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sonuc user_onboarding;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF _version IS NULL OR _version < 1 OR _version > 1000 THEN
    RAISE EXCEPTION 'invalid_tour_version';
  END IF;

  INSERT INTO user_onboarding (user_id, completed_tour_version, tour_completed_at, updated_at)
  VALUES (auth.uid(), _version, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET completed_tour_version = GREATEST(user_onboarding.completed_tour_version, EXCLUDED.completed_tour_version),
        tour_completed_at = now(),
        updated_at = now()
  RETURNING * INTO sonuc;

  RETURN sonuc;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_product_tour(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_product_tour(integer) TO authenticated;
