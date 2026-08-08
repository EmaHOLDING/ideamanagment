-- PostgreSQL RLS'te "INSERT ... RETURNING", eklenen satırın aynı
-- zamanda bir SELECT politikasını da sağlamasını gerektirir. workspaces
-- tablosundaki SELECT politikası workspace_members üyeliğine bağlı
-- olduğundan, workspace satırı oluşturulduğu anda (üyelik satırı henüz
-- eklenmemişken) RETURNING isteği RLS ihlali hatası verir — klasik bir
-- "tavuk-yumurta" RLS problemi. Aynı sorun, invite_code ile bir
-- workspace'i arayan (henüz üye olmayan) kullanıcı için de geçerlidir.
--
-- Çözüm: bu iki akışı SECURITY DEFINER fonksiyonlar üzerinden
-- yürütmek. Fonksiyon, tablo sahibi (postgres) yetkisiyle çalıştığından
-- iç sorguları RLS'e tabi değildir, ama fonksiyonun kendisi yalnızca
-- belirli/dar bir işlemi (workspace oluşturma / invite code ile
-- katılma) yapar — auth.uid() ile kimliği doğrulanmış kullanıcı adına,
-- keyfi SQL çalıştırmaya izin vermez.

CREATE OR REPLACE FUNCTION public.create_workspace(
  _title varchar,
  _template_id uuid DEFAULT NULL
)
RETURNS workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace workspaces;
  found_columns_config jsonb;
  col jsonb;
  idx int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  INSERT INTO workspaces (title) VALUES (_title) RETURNING * INTO new_workspace;

  INSERT INTO workspace_members (workspace_id, user_id) VALUES (new_workspace.id, auth.uid());

  IF _template_id IS NOT NULL THEN
    SELECT bt.columns_config INTO found_columns_config
    FROM board_templates bt
    WHERE bt.id = _template_id
    AND (bt.is_system = true OR bt.user_id = auth.uid());

    IF found_columns_config IS NULL THEN
      RAISE EXCEPTION 'template not found or access denied';
    END IF;

    FOR col IN SELECT * FROM jsonb_array_elements(found_columns_config)
    LOOP
      INSERT INTO kanban_columns (workspace_id, title, status_type, "order")
      VALUES (new_workspace.id, col->>'title', (col->>'status_type')::status_type, idx);
      idx := idx + 1;
    END LOOP;
  END IF;

  RETURN new_workspace;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_workspace_by_invite_code(
  _invite_code varchar
)
RETURNS workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_workspace workspaces;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT * INTO target_workspace FROM workspaces WHERE invite_code = _invite_code;

  IF target_workspace.id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite_code';
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id)
  VALUES (target_workspace.id, auth.uid())
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN target_workspace;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(varchar, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_workspace_by_invite_code(varchar) TO authenticated;
