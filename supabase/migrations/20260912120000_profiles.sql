-- profiles: auth.users'in okunabilir bir yansimasi.
--
-- Sorun: created_by/user_id/actor_id gibi UUID'leri isme ve e-postaya
-- cevirmek icin resolveAuthorProfiles, her kullanici icin AYRI bir
-- admin.auth.admin.getUserById() HTTP cagrisi yapiyordu -- cache'siz, ve
-- bes ayri yerden (uye listesi, yorumlar, aktivite akisi, versiyon
-- gecmisi, ekler). 30 satirlik bir aktivite akisinda 8 farkli kisi varsa,
-- panel her acildiginda 8 ayri ag cagrisi gidiyordu.
--
-- auth.users'a RLS ile dogrudan erisilemedigi icin (Supabase'in kendi
-- semasi) standart cozum, trigger ile senkron tutulan bir public tablo.
-- Boylece tek JOIN yeterli oluyor ve bu yollardan service_role kullanimi
-- tamamen kalkiyor.

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Gorunurluk: kendi profilin + seninle EN AZ BIR workspace'i paylasan
-- kisilerin profili. Bu, uygulamanin zaten gosterdigi bilgiyle birebir
-- ortusuyor (uye listesi, yorum yazari, aktivite aktoru) ve rastgele bir
-- kullanicinin tum kullanici tabanini cekip e-posta toplamasini onluyor.
--
-- SECURITY DEFINER fonksiyon uzerinden, cunku politika icinden
-- workspace_members'a dogrudan subquery atmak RLS recursion'ina yol acar
-- (is_workspace_member ile ayni desen).
-- =========================================================
CREATE OR REPLACE FUNCTION public.shares_workspace_with(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members benim
    JOIN workspace_members digeri ON digeri.workspace_id = benim.workspace_id
    WHERE benim.user_id = auth.uid()
      AND benim.status = 'ACTIVE'
      AND digeri.user_id = _user_id
      AND digeri.status = 'ACTIVE'
  );
$$;

GRANT EXECUTE ON FUNCTION public.shares_workspace_with(uuid) TO authenticated;

-- Ikinci kosul: workspace'ten CIKARILMIS kisilerin gecmis icerigi
-- (yorumlari, fikirleri, aktivite kayitlari) panoda durmaya devam ediyor.
-- Yalnizca "ortak workspace" kuralini uygularsak bu icerigin yazari
-- "Bilinmeyen kullanici" olarak gorunur -- eskiden admin API adi
-- dondurdugu icin bu bir gerileme olurdu. Bu yuzden, CAGIRANIN aktif uyesi
-- oldugu bir workspace'te icerigi bulunan kisilerin profili de okunabilir.
-- Sinir hala caginin kendi workspace'leri: disaridan rastgele bir UUID
-- sorgulayip e-posta toplamak mumkun degil.
CREATE OR REPLACE FUNCTION public.authored_in_my_workspace(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM activity_log a
    WHERE a.actor_id = _user_id AND is_workspace_member(a.workspace_id)
  ) OR EXISTS (
    SELECT 1 FROM comments c JOIN ideas i ON i.id = c.idea_id
    WHERE c.user_id = _user_id AND is_workspace_member(i.workspace_id)
  ) OR EXISTS (
    SELECT 1 FROM idea_versions v JOIN ideas i ON i.id = v.idea_id
    WHERE v.created_by = _user_id AND is_workspace_member(i.workspace_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.authored_in_my_workspace(uuid) TO authenticated;

-- Yukaridaki EXISTS'leri destekleyen indeksler (bu kolonlarda indeks yoktu).
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_idea_versions_created_by ON idea_versions(created_by);

CREATE POLICY "kendi_veya_ortak_workspace_profilleri_okunur"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR shares_workspace_with(id)
  OR authored_in_my_workspace(id)
);

-- Yazma yalnizca trigger uzerinden (SECURITY DEFINER); hicbir INSERT/
-- UPDATE/DELETE politikasi yok, dolayisiyla authenticated yazamaz.
REVOKE INSERT, UPDATE, DELETE ON profiles FROM authenticated;

-- =========================================================
-- Senkronizasyon: auth.users'a yazilan her sey profiles'a yansir.
-- Ad cozumleme sirasi lib/user-display.ts'teki getDisplayName ile ayni
-- tutuluyor (once first/last_name, sonra full_name, sonra e-posta).
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'first_name', '')), '');
  v_last  text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'last_name', '')), '');
  v_full  text := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');
  v_ad    text;
BEGIN
  IF v_first IS NOT NULL OR v_last IS NOT NULL THEN
    v_ad := btrim(concat_ws(' ', v_first, v_last));
  ELSE
    v_ad := COALESCE(v_full, NEW.email);
  END IF;

  INSERT INTO profiles (id, email, full_name, updated_at)
  VALUES (NEW.id, NEW.email, v_ad, now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER auth_user_profilini_senkronla
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_from_auth_user();

-- Mevcut kullanicilari geriye donuk doldur.
INSERT INTO profiles (id, email, full_name, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(btrim(concat_ws(' ',
      NULLIF(btrim(COALESCE(u.raw_user_meta_data->>'first_name', '')), ''),
      NULLIF(btrim(COALESCE(u.raw_user_meta_data->>'last_name', '')), '')
    )), ''),
    NULLIF(btrim(COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
    u.email
  ),
  now()
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
