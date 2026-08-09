-- Faz 10: Realtime İşbirliği. İlgili tabloları supabase_realtime publication'ına
-- ekleyerek postgres_changes event'lerinin istemcilere yayınlanmasını sağlıyoruz.
-- RLS zaten SELECT politikalarıyla kimin hangi satırı görebileceğini kısıtlıyor;
-- Realtime bağlantısı kullanıcının JWT'siyle kimlik doğrulandığı sürece bu
-- politikalar postgres_changes event'leri için de uygulanıyor.
ALTER PUBLICATION supabase_realtime ADD TABLE ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE idea_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members;
