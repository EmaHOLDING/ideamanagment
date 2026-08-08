-- Faz 6: Yorumda mention. Basit array — join tablosu gerekmiyor, sadece
-- bildirim tetiklemek için okunuyor (filtreleme/agregasyon ihtiyacı yok).
ALTER TABLE comments ADD COLUMN mentioned_user_ids uuid[] NULL;
