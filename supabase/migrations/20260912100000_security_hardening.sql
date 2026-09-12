-- Güvenlik denetimi sonrası sıkılaştırmalar.
--
-- Denetimde, RLS'in yazma tarafında üç ayrı yerde "hangi SATIRA" sorusunun
-- doğru, ama "hangi KOLONA" sorusunun hiç sorulmadığı ortaya çıktı. Tablo
-- seviyesinde UPDATE/INSERT yetkisi verilmiş olduğu için, bir satırı
-- değiştirmeye yetkili olan kişi o satırın workspace_id/role/archived_at
-- gibi yetki taşıyan kolonlarını da yeniden yazabiliyordu. Aşağıdaki üç
-- düzeltme bunu kapatıyor.

-- =========================================================
-- 1) KRİTİK — workspace ele geçirme.
--
-- "user_can_insert_own_membership" politikası yalnızca
-- user_id = auth.uid() kontrol ediyordu: davet, üyelik ya da rol kontrolü
-- yoktu. Giriş yapmış herhangi biri, bir workspace'in UUID'sini bilmesi
-- (URL'de duruyor) yeterli olacak şekilde kendini o workspace'e OWNER
-- olarak ekleyebiliyordu — anon key tarayıcıda olduğu için server
-- action'lara hiç uğramadan, doğrudan PostgREST üzerinden. En gerçekçi
-- senaryo: workspace'ten çıkarılan bir üyenin kendini geri eklemesi.
--
-- Uygulamada workspace_members'a client tarafından INSERT yapan tek bir
-- yer yok; üyelik her zaman SECURITY DEFINER bir RPC ile oluşuyor
-- (create_workspace / join_workspace_by_invite_code / undo_remove_member).
-- Bu yüzden politikanın kaldırılması doğru çözüm: INSERT politikası
-- kalmayınca authenticated rolü için tablo tamamen kapanır, RPC'ler
-- (tablo sahibi olarak çalıştıkları için) etkilenmez.
-- =========================================================
DROP POLICY IF EXISTS "user_can_insert_own_membership" ON workspace_members;

-- =========================================================
-- 2) YÜKSEK — çapraz workspace yetki yükseltme.
--
-- managers_can_update_member_roles'ün WITH CHECK'i yalnızca
-- role <> 'OWNER' idi; USING'deki is_workspace_owner_or_admin kontrolü
-- WITH CHECK'te tekrarlanmıyordu. WITH CHECK YENİ satıra baktığı için,
-- kendi workspace'inin admin'i bir üyelik satırının workspace_id'sini
-- başka bir workspace'e yazıp oraya ADMIN olarak girebiliyordu.
--
-- Not: WITH CHECK açıkça yazıldığında USING ifadesini geçersiz kılar
-- (yalnızca WITH CHECK hiç yazılmazsa USING her ikisi için kullanılır) —
-- hatanın kaynağı tam olarak buydu.
-- =========================================================
DROP POLICY IF EXISTS "managers_can_update_member_roles" ON workspace_members;

CREATE POLICY "managers_can_update_member_roles"
ON workspace_members FOR UPDATE
USING (is_workspace_owner_or_admin(workspace_id) AND role <> 'OWNER')
WITH CHECK (is_workspace_owner_or_admin(workspace_id) AND role <> 'OWNER');

-- =========================================================
-- 3) Kolon bazlı UPDATE yetkileri.
--
-- RLS "hangi satır" sorusunu cevaplar, kolon bazlı GRANT ise "hangi
-- alan" sorusunu. Aşağıdaki üç tabloda yetki taşıyan kolonlar
-- (workspace_id, user_id, role, archived_at, deleted_at, created_by...)
-- doğrudan UPDATE'e kapatılıyor; bu alanları değiştiren tüm meşru akışlar
-- zaten kendi yetki kontrolünü yapan SECURITY DEFINER RPC'lerden geçiyor
-- ve GRANT'lardan etkilenmiyor.
--
-- İzin verilen kolon listeleri, uygulamadaki doğrudan .update() çağrılarının
-- birebir yazdığı alanlardan çıkarıldı.
-- =========================================================

-- projects: yalnızca updateProject'in yazdığı içerik alanları.
-- Böylece archive_project/soft_delete_project'teki "sadece owner/admin"
-- kontrolü, düz bir UPDATE ile archived_at yazılarak atlanamaz.
REVOKE UPDATE ON projects FROM authenticated;
GRANT UPDATE (name, description, problem_statement, target_audience, color)
  ON projects TO authenticated;

-- ideas: doğrudan UPDATE edilen hiçbir yer yok; tek ihtiyaç, update_idea
-- RPC'sinin (bilinçli olarak SECURITY DEFINER DEĞİL, invoker güvenliğiyle
-- çalışır) versiyon numarasını ilerletmesi. workspace_id'nin kapanmasıyla
-- birlikte, bir fikri oluşturan kişinin onu başka bir workspace'e taşıması
-- da engellenmiş oluyor.
REVOKE UPDATE ON ideas FROM authenticated;
GRANT UPDATE (current_version, updated_at) ON ideas TO authenticated;

-- workspace_members: updateMemberRole yalnızca role yazar. workspace_id ve
-- user_id'nin kapanması, (2)'deki WITH CHECK düzeltmesinin üstüne ikinci
-- bir savunma katmanı koyuyor.
REVOKE UPDATE ON workspace_members FROM authenticated;
GRANT UPDATE (role) ON workspace_members TO authenticated;

-- =========================================================
-- 4) ORTA — move_idea, hedef kolonun aynı workspace'te olduğunu
-- doğrulamıyordu. Her iki workspace'in de üyesi olan biri, bir fikri
-- başka bir workspace'in kolonuna taşıyabiliyordu; fikir o noktadan sonra
-- iki panoda da görünmez oluyordu (pano kendi kolonlarına, sorgular
-- workspace_id'ye göre filtrelediği için) — kullanıcı açısından veri kaybı.
-- =========================================================
CREATE OR REPLACE FUNCTION public.move_idea(
  _idea_id uuid,
  _target_column_id uuid,
  _cancellation_reason text DEFAULT NULL
)
RETURNS ideas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_idea ideas;
  v_workspace_id uuid;
  v_target_workspace_id uuid;
BEGIN
  SELECT workspace_id INTO v_workspace_id FROM ideas WHERE id = _idea_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'idea not found';
  END IF;

  IF NOT is_workspace_contributor(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only contributors can move ideas';
  END IF;

  SELECT workspace_id INTO v_target_workspace_id
  FROM kanban_columns
  WHERE id = _target_column_id AND deleted_at IS NULL;

  IF v_target_workspace_id IS DISTINCT FROM v_workspace_id THEN
    RAISE EXCEPTION 'column_not_in_workspace';
  END IF;

  UPDATE ideas
  SET column_id = _target_column_id,
      cancellation_reason = _cancellation_reason,
      updated_at = timezone('utc'::text, now())
  WHERE id = _idea_id
  RETURNING * INTO updated_idea;

  RETURN updated_idea;
END;
$$;
