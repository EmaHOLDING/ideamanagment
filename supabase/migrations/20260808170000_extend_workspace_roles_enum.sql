-- Faz 8: workspace_role enum'una ADMIN ve VIEWER eklenir. Postgres'te
-- ALTER TYPE ... ADD VALUE aynı transaction içinde hemen kullanılamaz,
-- bu yüzden bu değerleri kullanan her şey (fonksiyonlar, RLS politikaları)
-- SONRAKİ migration dosyasında (_role_based_permissions.sql) tanımlanır.
ALTER TYPE workspace_role ADD VALUE 'ADMIN';
ALTER TYPE workspace_role ADD VALUE 'VIEWER';
