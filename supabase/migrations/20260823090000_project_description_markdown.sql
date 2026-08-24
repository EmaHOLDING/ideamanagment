-- Faz 18 devamı: projects.description artık fikir içeriğiyle aynı şekilde
-- (Tiptap tabanlı, MD içe aktarılabilen) zengin metin/markdown tutuyor —
-- varchar(500) sınırı kaldırılıp idea_versions.content ile aynı tipe
-- (sınırsız text) geçiliyor.
ALTER TABLE projects ALTER COLUMN description TYPE text;
