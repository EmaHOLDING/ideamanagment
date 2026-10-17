-- Sayfa turlari icin "?" butonu ipucu.
--
-- Sayfa turlari kendiliginden acilmiyor. Bunun yerine, turu olan bir
-- sayfaya ILK girildiginde "?" butonu birkac saniye hafifce parliyor. Bu
-- ipucunun her sayfa icin yalnizca bir kez gosterilmesi icin, hangi
-- sayfalarda gosterildigi burada tutuluyor (genel turdaki gibi tarayici
-- yerine veritabaninda: yeni bir cihazda tekrar parlamasin).

ALTER TABLE user_onboarding
  ADD COLUMN seen_page_tour_hints text[] NOT NULL DEFAULT '{}';

-- =========================================================
-- mark_page_tour_hint_seen: cagiranin satirina sayfa kimligini ekler.
-- Tablo istemciye yazmaya kapali (bkz. 20261017100000); tek yol bu RPC.
-- Sayfa kimligi serbest metin olmasin diye bicim kontrolu yapiliyor:
-- kucuk harf, rakam ve tire, en fazla 40 karakter.
-- =========================================================
CREATE OR REPLACE FUNCTION public.mark_page_tour_hint_seen(_page text)
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

  IF _page IS NULL OR _page !~ '^[a-z0-9-]{1,40}$' THEN
    RAISE EXCEPTION 'invalid_page_id';
  END IF;

  INSERT INTO user_onboarding (user_id, seen_page_tour_hints, updated_at)
  VALUES (auth.uid(), ARRAY[_page], now())
  ON CONFLICT (user_id) DO UPDATE
    SET seen_page_tour_hints = CASE
          WHEN _page = ANY(user_onboarding.seen_page_tour_hints) THEN user_onboarding.seen_page_tour_hints
          ELSE array_append(user_onboarding.seen_page_tour_hints, _page)
        END,
        updated_at = now()
  RETURNING * INTO sonuc;

  RETURN sonuc;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_page_tour_hint_seen(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_page_tour_hint_seen(text) TO authenticated;
