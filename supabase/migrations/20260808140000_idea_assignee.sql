-- Faz 6: Fikir ataması. Atanan kişi workspace üyelerinden biri olmalı;
-- kullanıcı silinirse (auth.users) atama otomatik boşa düşer.
ALTER TABLE ideas ADD COLUMN assignee_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;
