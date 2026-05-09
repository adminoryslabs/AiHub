BEGIN;

ALTER TABLE article_resources
  DROP CONSTRAINT IF EXISTS uq_article_resource;

ALTER TABLE article_resources
  ADD COLUMN IF NOT EXISTS lang VARCHAR(2);

UPDATE article_resources
SET lang = 'es'
WHERE lang IS NULL;

INSERT INTO article_resources (article_id, resource_id, lang)
SELECT ar.article_id, ar.resource_id, 'en'
FROM article_resources ar
WHERE ar.lang = 'es'
  AND NOT EXISTS (
    SELECT 1
    FROM article_resources existing
    WHERE existing.article_id = ar.article_id
      AND existing.resource_id = ar.resource_id
      AND existing.lang = 'en'
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_article_resources_lang'
  ) THEN
    ALTER TABLE article_resources
      ADD CONSTRAINT chk_article_resources_lang
      CHECK (lang IN ('es', 'en'));
  END IF;
END $$;

ALTER TABLE article_resources
  ALTER COLUMN lang SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_article_resource_lang'
  ) THEN
    ALTER TABLE article_resources
      ADD CONSTRAINT uq_article_resource_lang UNIQUE (article_id, resource_id, lang);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_article_resources_article_lang
  ON article_resources(article_id, lang);

COMMIT;
