-- Faz 11: Ekler ve Dosyalar (Attachments). Supabase Storage tabanlı, mevcut
-- soft-delete + 30sn undo altyapısıyla birebir aynı deseni kullanan dosya eki
-- modülü. Tiptap editörüne dokunulmuyor — bu, fikir detay penceresindeki ayrı
-- bir panel.

CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at timestamptz DEFAULT NULL
);

CREATE INDEX idx_attachments_idea_deleted ON attachments(idea_id, deleted_at);
CREATE INDEX idx_attachments_workspace ON attachments(workspace_id);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- workspace-media: private bucket. Dosya yolu deseni:
-- {workspace_id}/{idea_id}/{uuid}-{dosya_adı} — storage.objects RLS
-- politikaları bu yoldan workspace_id'yi storage.foldername() ile çıkarıp
-- mevcut is_workspace_member/is_workspace_contributor/
-- is_workspace_owner_or_admin yardımcı fonksiyonlarını (Faz 6/8'de
-- tanımlı) yeniden kullanıyor.
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-media', 'workspace-media', false)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- attachments tablosu RLS: SELECT ve INSERT düz politika ile ifade
-- edilebiliyor. UPDATE (soft-delete/undo) ve DELETE (hard-delete) ise
-- move_idea/soft_delete_comment ile aynı sebepten (yükleyen VEYA
-- owner/admin yetkisi — plain RLS bunu her iki komut için de ifade
-- edebilir ama RETURNING'in SELECT politikasına tabi olması sonucu
-- soft-delete sonrası "0 satır" yanlış-negatifine yol açabildiğinden)
-- SECURITY DEFINER RPC'ler üzerinden yapılıyor; bu yüzden tabloda ayrı
-- bir UPDATE/DELETE politikası TANIMLANMIYOR (bilerek) — böylece
-- soft-delete/undo/hard-delete sadece RPC'ler üzerinden yapılabiliyor.
-- =========================================================
CREATE POLICY "members_can_select_attachments"
ON attachments FOR SELECT
USING (is_workspace_member(workspace_id) AND deleted_at IS NULL);

CREATE POLICY "contributors_can_insert_attachments"
ON attachments FOR INSERT
WITH CHECK (is_workspace_contributor(workspace_id));

CREATE POLICY "members_can_select_workspace_media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'workspace-media'
  AND is_workspace_member(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "contributors_can_insert_workspace_media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workspace-media'
  AND is_workspace_contributor(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "uploader_or_managers_can_delete_workspace_media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'workspace-media'
  AND (owner = auth.uid() OR is_workspace_owner_or_admin(((storage.foldername(name))[1])::uuid))
);

-- =========================================================
-- soft_delete_attachment / undo_delete_attachment / hard_delete_attachment:
-- soft_delete_comment ile aynı iskelet (SECURITY DEFINER). hard_delete
-- dosyanın file_path'ini RETURNING ile geri veriyor, server action bunu
-- storage.remove() çağrısında kullanıyor.
-- =========================================================
CREATE OR REPLACE FUNCTION public.soft_delete_attachment(_attachment_id uuid)
RETURNS attachments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_attachment attachments;
  v_uploaded_by uuid;
  v_workspace_id uuid;
BEGIN
  SELECT uploaded_by, workspace_id INTO v_uploaded_by, v_workspace_id
  FROM attachments WHERE id = _attachment_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'attachment not found';
  END IF;

  IF v_uploaded_by IS DISTINCT FROM auth.uid() AND NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the uploader or workspace managers can delete this attachment';
  END IF;

  UPDATE attachments
  SET deleted_at = timezone('utc'::text, now())
  WHERE id = _attachment_id
  RETURNING * INTO updated_attachment;

  RETURN updated_attachment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_attachment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_delete_attachment(_attachment_id uuid)
RETURNS attachments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_attachment attachments;
  v_uploaded_by uuid;
  v_workspace_id uuid;
BEGIN
  SELECT uploaded_by, workspace_id INTO v_uploaded_by, v_workspace_id
  FROM attachments WHERE id = _attachment_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'attachment not found';
  END IF;

  IF v_uploaded_by IS DISTINCT FROM auth.uid() AND NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the uploader or workspace managers can restore this attachment';
  END IF;

  UPDATE attachments
  SET deleted_at = NULL
  WHERE id = _attachment_id
  RETURNING * INTO updated_attachment;

  RETURN updated_attachment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_delete_attachment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.hard_delete_attachment(_attachment_id uuid)
RETURNS attachments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_attachment attachments;
  v_uploaded_by uuid;
  v_workspace_id uuid;
BEGIN
  SELECT uploaded_by, workspace_id INTO v_uploaded_by, v_workspace_id
  FROM attachments WHERE id = _attachment_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'attachment not found';
  END IF;

  IF v_uploaded_by IS DISTINCT FROM auth.uid() AND NOT is_workspace_owner_or_admin(v_workspace_id) THEN
    RAISE EXCEPTION 'permission_denied: only the uploader or workspace managers can permanently delete this attachment';
  END IF;

  DELETE FROM attachments
  WHERE id = _attachment_id
  RETURNING * INTO deleted_attachment;

  RETURN deleted_attachment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hard_delete_attachment(uuid) TO authenticated;
