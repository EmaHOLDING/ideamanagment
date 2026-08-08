-- Sistem şablonları (Bölüm 6.G, 7.D)
INSERT INTO board_templates (title, columns_config, is_system) VALUES
('Basit Kanban', '[
  {"title": "Taslak", "status_type": "DRAFT"},
  {"title": "İncelemede", "status_type": "IN_REVIEW"},
  {"title": "Onaylandı", "status_type": "APPROVED"},
  {"title": "Tamamlandı", "status_type": "DONE"}
]'::jsonb, true),
('İptal Takipli Kanban', '[
  {"title": "Taslak", "status_type": "DRAFT"},
  {"title": "İncelemede", "status_type": "IN_REVIEW"},
  {"title": "Onaylandı", "status_type": "APPROVED"},
  {"title": "İptal", "status_type": "CANCELLED"},
  {"title": "Tamamlandı", "status_type": "DONE"}
]'::jsonb, true);
