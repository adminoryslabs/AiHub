-- Seed inicial de categorías del MVP
-- Idempotente: usa ON CONFLICT DO NOTHING

INSERT INTO categories (slug, name_es, name_en, display_order) VALUES
  ('fundamentals', 'Fundamentos',  'Fundamentals', 1),
  ('agents',       'Agentes',      'Agents',       2),
  ('prompting',    'Prompting',    'Prompting',    3),
  ('patterns',     'Patrones',     'Patterns',     4),
  ('tools',        'Herramientas', 'Tools',        5)
ON CONFLICT (slug) DO NOTHING;
