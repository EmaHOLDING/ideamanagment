-- Faz 15: Kolon yeniden adlandırma/sıralama + Etiket düzenleme + Workspace
-- açıklaması. Kolon rename/reorder ve etiket silme için gereken RLS zaten
-- mevcut (managers_can_update_kanban_columns / contributors_can_delete_tags,
-- bkz. 20260808171000_role_based_permissions.sql) — sadece eksik olanlar
-- ekleniyor.

-- =========================================================
-- 1) workspaces.description — opsiyonel, en fazla 250 karakter.
-- =========================================================
ALTER TABLE workspaces ADD COLUMN description varchar(250) NULL;

-- =========================================================
-- 2) create_workspace RPC'sine _description parametresi eklenir.
-- ÖNEMLİ: CREATE OR REPLACE FUNCTION, parametre LİSTESİ farklıysa
-- (trailing DEFAULT'lu yeni bir parametre eklense bile) mevcut
-- fonksiyonun yerini almaz — YENİ bir overload oluşturur. Bu, daha önce
-- update_idea'da yaşanan PGRST203 hatasının birebir aynısı olduğu için,
-- eski 2 parametreli imza burada açıkça DROP edilip tek imza olarak
-- yeniden oluşturuluyor.
-- =========================================================
DROP FUNCTION IF EXISTS public.create_workspace(varchar, uuid);

CREATE OR REPLACE FUNCTION public.create_workspace(
  _title varchar,
  _template_id uuid DEFAULT NULL,
  _description varchar DEFAULT NULL
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

  INSERT INTO workspaces (title, description) VALUES (_title, _description) RETURNING * INTO new_workspace;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace.id, auth.uid(), 'OWNER');

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

GRANT EXECUTE ON FUNCTION public.create_workspace(varchar, uuid, varchar) TO authenticated;

-- =========================================================
-- 3) tags: UPDATE policy eksikti (sadece SELECT/INSERT/DELETE vardı) —
-- etiket adı/rengini düzenleme için contributors_can_delete_tags ile
-- aynı yetki seviyesinde (is_workspace_contributor) eklenir.
-- =========================================================
CREATE POLICY "contributors_can_update_tags"
ON tags FOR UPDATE
USING (is_workspace_contributor(workspace_id))
WITH CHECK (is_workspace_contributor(workspace_id));
