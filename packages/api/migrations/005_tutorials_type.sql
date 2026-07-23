-- Migración 005: reemplazar tool-branch por tutorial, eliminar parent_id
-- Requiere: 001_initial_schema.sql ejecutada previamente
-- Ejecutar: psql $DATABASE_URL -f 005_tutorials_type.sql
-- Rollback: ver sección "Down migration" al final de este archivo

BEGIN;

-- 1. Eliminar índice obsoleto sobre parent_id
DROP INDEX IF EXISTS idx_articles_parent;

-- 2. Eliminar el CHECK constraint actual sobre type
--    (el nombre exacto depende de PostgreSQL; se usa DO block para robustez)
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'articles'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%tool-branch%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE articles DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- 3. Agregar nuevo CHECK constraint
ALTER TABLE articles
  ADD CONSTRAINT articles_type_check
  CHECK (type IN ('concept', 'tutorial'));

-- 4. Agregar nuevas columnas
ALTER TABLE articles
  ADD COLUMN difficulty VARCHAR(15),
  ADD COLUMN estimated_time VARCHAR(50);

ALTER TABLE articles
  ADD CONSTRAINT articles_difficulty_check
  CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced'));

-- 5. Migrar los 8 artículos existentes de tool-branch a su nuevo type
UPDATE articles SET type = 'tutorial',
  difficulty = 'intermediate',
  estimated_time = '20 min'
WHERE slug_uk IN (
  'claude-code-for-testing',
  'getting-started-with-claude-design',
  'stitch-infinite-canvas',
  'stitch-screen-by-screen'
);

UPDATE articles SET type = 'concept',
  category = 'tools'
WHERE slug_uk IN (
  'stitch',
  'warp-terminal',
  'stitch-vs-figma',
  'subagents-in-claude-code'
);

-- 6. Eliminar la columna parent_id (ya no se usa)
ALTER TABLE articles DROP COLUMN parent_id;

-- 7. Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_articles_difficulty ON articles(difficulty);
CREATE INDEX IF NOT EXISTS idx_articles_type_difficulty ON articles(type, difficulty);

COMMIT;

-- ============================================================
-- Down migration (rollback)
-- Ejecutar solo si se necesita revertir esta migración
-- ============================================================

-- BEGIN;
--
-- -- 1. Restaurar parent_id
-- ALTER TABLE articles ADD COLUMN parent_id UUID REFERENCES articles(id) ON DELETE SET NULL;
--
-- -- 2. Restaurar type a tool-branch en los 8 artículos
-- UPDATE articles SET type = 'tool-branch', difficulty = NULL, estimated_time = NULL
-- WHERE slug_uk IN (
--   'claude-code-for-testing', 'getting-started-with-claude-design',
--   'stitch-infinite-canvas', 'stitch-screen-by-screen',
--   'stitch', 'warp-terminal', 'stitch-vs-figma', 'subagents-in-claude-code'
-- );
--
-- -- 3. Eliminar CHECK actual
-- DO $$
-- DECLARE
--     constraint_name text;
-- BEGIN
--     SELECT con.conname INTO constraint_name
--     FROM pg_constraint con
--     JOIN pg_class rel ON rel.oid = con.conrelid
--     WHERE rel.relname = 'articles'
--       AND con.contype = 'c'
--       AND pg_get_constraintdef(con.oid) LIKE '%tutorial%';
--
--     IF constraint_name IS NOT NULL THEN
--         EXECUTE format('ALTER TABLE articles DROP CONSTRAINT %I', constraint_name);
--     END IF;
-- END $$;
--
-- -- 4. Restaurar CHECK original
-- ALTER TABLE articles
--   ADD CONSTRAINT articles_type_check
--   CHECK (type IN ('concept', 'tool-branch'));
--
-- -- 5. Eliminar columnas nuevas
-- ALTER TABLE articles DROP COLUMN difficulty, DROP COLUMN estimated_time;
--
-- -- 6. Restaurar índice parent_id
-- CREATE INDEX IF NOT EXISTS idx_articles_parent ON articles(parent_id);
--
-- -- 7. Eliminar índices nuevos
-- DROP INDEX IF EXISTS idx_articles_difficulty;
-- DROP INDEX IF EXISTS idx_articles_type_difficulty;
--
-- COMMIT;
