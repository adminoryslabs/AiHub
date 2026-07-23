-- Migración 005: reemplazar tool-branch por tutorial, eliminar parent_id
-- Requiere: 001_initial_schema.sql ejecutada previamente
-- Ejecutar: psql $DATABASE_URL -f 005_tutorials_type.sql
-- Rollback: ver sección "Down migration" al final de este archivo
-- Idempotente: puede correrse múltiples veces sin fallar.

BEGIN;

-- 1. Eliminar índice obsoleto sobre parent_id
DROP INDEX IF EXISTS idx_articles_parent;

-- 2. Eliminar el CHECK constraint actual sobre type
--    (busca por definición porque el nombre puede variar entre instalaciones)
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

-- 3. Agregar nuevo CHECK constraint (idempotente: salta si ya existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'articles'::regclass
          AND conname = 'articles_type_check'
    ) THEN
        ALTER TABLE articles
          ADD CONSTRAINT articles_type_check
          CHECK (type IN ('concept', 'tutorial'));
    END IF;
END $$;

-- 4. Agregar nuevas columnas (idempotente)
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS difficulty VARCHAR(15),
  ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(50);

-- 4b. CHECK constraint sobre difficulty (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'articles'::regclass
          AND conname = 'articles_difficulty_check'
    ) THEN
        ALTER TABLE articles
          ADD CONSTRAINT articles_difficulty_check
          CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced'));
    END IF;
END $$;

-- 5. Migrar TODOS los artículos con type='tool-branch' a type='concept'
--    con category='tools'.
-- Decisión 2026-07-23: la exploración inicial asumió 8 tool-branches
-- (los del filesystem local + aihub_test), pero producción tiene 32.
-- Todos tienen `category='tools'` y un `parent_id` seteado, lo que indica
-- que son descripciones enciclopédicas de herramientas, no tutoriales
-- hands-on. Esta es la extensión del patrón de los 4 que originalmente
-- íbamos a clasificar como concept. La relación padre-hijo previa se
-- puede recrear manualmente como `prerequisite` en `article_relations`
-- desde el panel admin si es editorialmente valiosa.
UPDATE articles SET type = 'concept', category = 'tools'
WHERE type = 'tool-branch';

-- 6. Eliminar la columna parent_id (ya no se usa)
ALTER TABLE articles DROP COLUMN IF EXISTS parent_id;

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
-- ALTER TABLE articles ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES articles(id) ON DELETE SET NULL;
--
-- -- 2. Restaurar type a tool-branch en todos los que originalmente lo eran
-- --    (no se puede saber con certeza cuáles eran tool-branch antes sin
-- --    un backup; este rollback es aproximado)
-- UPDATE articles SET type = 'tool-branch', difficulty = NULL, estimated_time = NULL
-- WHERE category = 'tools'
--   AND id IN (
--     SELECT id FROM articles WHERE id NOT IN (
--       SELECT id FROM articles WHERE difficulty IS NOT NULL
--     )
--   );
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
-- ALTER TABLE articles DROP COLUMN IF EXISTS difficulty, DROP COLUMN IF EXISTS estimated_time;
--
-- -- 6. Restaurar índice parent_id
-- CREATE INDEX IF NOT EXISTS idx_articles_parent ON articles(parent_id);
--
-- -- 7. Eliminar índices nuevos
-- DROP INDEX IF EXISTS idx_articles_difficulty;
-- DROP INDEX IF EXISTS idx_articles_type_difficulty;
--
-- COMMIT;
