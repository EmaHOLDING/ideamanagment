-- Faz 19: Soft-delete edilmiş kayıtların GERÇEKTEN kalıcı silinmesi.
--
-- Sorun: Faz 9'dan beri "sil → 30 sn geri al → kalıcı sil" deseni
-- anlatılıyordu, ancak kalıcı silme YALNIZCA ek dosyalar için
-- (hard_delete_attachment, istemciden tetikleniyor) uygulanmıştı.
-- Fikir/yorum/proje/kolon/etiket/workspace satırları deleted_at dolu
-- şekilde sonsuza kadar duruyordu. Bu hem depolama şişmesi hem de
-- KVKK/GDPR açısından sorun ("sil" dediğinde silmeyen sistem).
--
-- Çözüm: sunucu tarafında zamanlanmış bir temizlik işi. İstemciye
-- güvenmiyoruz — kullanıcı sekmeyi kapatsa da temizlik çalışır.
--
-- Saklama süresi (retention): arayüzdeki geri alma penceresi 30 saniye,
-- ancak kalıcı silmeyi 24 saate çekiyoruz. Bu, yanlışlıkla yapılan
-- toplu bir silmede yöneticiye SQL ile kurtarma şansı bırakır; kullanıcı
-- vaadini bozmaz (30 sn sonrası arayüzden zaten geri alınamaz).

-- =========================================================
-- purge_expired_deletions: saklama süresi dolmuş soft-delete kayıtlarını
-- kalıcı olarak siler. Yalnızca zamanlanmış iş / bakım için — authenticated
-- rolüne GRANT VERİLMEZ.
--
-- NOT: attachments bilerek kapsam dışı. Bir eki silmek, depodaki (Storage)
-- dosyanın da silinmesini gerektiriyor ve bu SQL'den yapılamıyor; ekler
-- için istemci tetikli hard_delete_attachment akışı korunuyor.
-- =========================================================
CREATE OR REPLACE FUNCTION public.purge_expired_deletions(
  _retention interval DEFAULT '24 hours'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz := timezone('utc'::text, now()) - _retention;
  v_comments int;
  v_ideas int;
  v_tags int;
  v_columns int;
  v_projects int;
  v_workspaces int;
BEGIN
  DELETE FROM comments WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS v_comments = ROW_COUNT;

  DELETE FROM ideas WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS v_ideas = ROW_COUNT;

  DELETE FROM tags WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS v_tags = ROW_COUNT;

  DELETE FROM kanban_columns WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS v_columns = ROW_COUNT;

  DELETE FROM projects WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS v_projects = ROW_COUNT;

  -- En son: workspace silmek içindeki her şeyi zaten CASCADE ile götürür.
  DELETE FROM workspaces WHERE deleted_at IS NOT NULL AND deleted_at < cutoff;
  GET DIAGNOSTICS v_workspaces = ROW_COUNT;

  RETURN jsonb_build_object(
    'cutoff', cutoff,
    'comments', v_comments,
    'ideas', v_ideas,
    'tags', v_tags,
    'kanban_columns', v_columns,
    'projects', v_projects,
    'workspaces', v_workspaces
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_deletions(interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_deletions(interval) FROM anon, authenticated;

-- =========================================================
-- Saatlik zamanlama. pg_cron her ortamda kurulamayabilir (yönetilen
-- Supabase'te eklenti izni gerekir); bu yüzden hem eklenti kurulumu hem
-- zamanlama hata durumunda migration'ı düşürmeyecek şekilde sarmalandı.
-- Zamanlama kurulamazsa fonksiyon yine de hazırdır ve elle/dışarıdan
-- (ör. bir cron servisi) çağrılabilir.
-- =========================================================
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron kurulamadi (%). purge_expired_deletions elle zamanlanmali.', SQLERRM;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('purge-expired-deletions');
EXCEPTION WHEN OTHERS THEN
  NULL; -- daha once zamanlanmamis
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'purge-expired-deletions',
    '17 * * * *',
    'SELECT public.purge_expired_deletions()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron.schedule basarisiz (%). purge_expired_deletions elle zamanlanmali.', SQLERRM;
END;
$$;
