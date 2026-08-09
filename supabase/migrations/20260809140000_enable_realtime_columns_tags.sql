-- Faz 10 devamı: kolonlar ve etiketler de realtime yayınına ekleniyor —
-- Owner/Admin kolon ekleyip silerken veya biri yeni etiket oluştururken
-- diğer kullanıcılar sayfa yenilemeden görsün.
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
