-- Bildirime tıklanınca ilgili fikre/workspace'e gidebilmek için
-- notifications.workspace_id eklenir. idea_id üzerinden ideas.workspace_id'ye
-- join etmek yerine (hem her okuma sorgusunu ağırlaştırır hem de realtime
-- INSERT payload'ında (postgres_changes) join sonucu yer almaz, yalnızca ham
-- satır gelir) doğrudan bir kolon olarak saklanması, hem sorguyu hem de
-- realtime tarafını basitleştiriyor.

ALTER TABLE notifications ADD COLUMN workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;

UPDATE notifications n
SET workspace_id = i.workspace_id
FROM ideas i
WHERE n.idea_id = i.id;

ALTER TABLE notifications ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX idx_notifications_workspace ON notifications(workspace_id);
