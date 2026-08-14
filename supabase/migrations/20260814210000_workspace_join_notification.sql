-- Workspace'e katılma bildirimi: bir kullanıcı bekleyen davetini kabul edip
-- (PENDING -> ACTIVE) workspace'e fiilen katıldığında, mevcut aktif üyelere
-- uygulama içi bildirim + aktivite akışı kaydı düşülüyor. Bu bildirimin
-- belirli bir fikirle ilgisi yok (workspace-seviyesinde bir olay), bu
-- yüzden notifications.idea_id artık NULL olabiliyor — önceki tüm
-- bildirim türleri (yorum/mention/atama/taşıma) zaten hep bir fikre bağlı
-- olduğu için onları etkilemiyor.
ALTER TABLE notifications ALTER COLUMN idea_id DROP NOT NULL;
