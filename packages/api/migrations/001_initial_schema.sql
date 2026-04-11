-- Migración inicial: schema completo de AI Hub
-- Ejecutar: psql $DATABASE_URL -f 001_initial_schema.sql

-- categories (debe crearse antes que articles por la FK)
CREATE TABLE IF NOT EXISTS categories (
  slug VARCHAR(30) PRIMARY KEY,
  name_es VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- articles
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_uk VARCHAR(200) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('concept', 'tool-branch')),
  parent_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  category VARCHAR(30) NOT NULL REFERENCES categories(slug),
  domains TEXT[] NOT NULL DEFAULT '{programming}',
  status VARCHAR(15) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'deprecated')),
  featured BOOLEAN NOT NULL DEFAULT false,
  volatility VARCHAR(10) NOT NULL DEFAULT 'low' CHECK (volatility IN ('low', 'medium', 'high')),
  applicable_as_of VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- article_contents
CREATE TABLE IF NOT EXISTS article_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  lang VARCHAR(2) NOT NULL CHECK (lang IN ('es', 'en')),
  slug VARCHAR(200) NOT NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  last_edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  CONSTRAINT uq_article_lang UNIQUE (article_id, lang)
);

-- article_relations
CREATE TABLE IF NOT EXISTS article_relations (
  from_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  to_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('related', 'prerequisite', 'next')),
  CONSTRAINT uq_article_relation UNIQUE (from_article_id, to_article_id, type),
  CONSTRAINT no_self_relation CHECK (from_article_id != to_article_id)
);

-- resources
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  type VARCHAR(15) NOT NULL CHECK (type IN ('doc', 'video', 'course', 'article')),
  url VARCHAR(2000) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- article_resources
CREATE TABLE IF NOT EXISTS article_resources (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  CONSTRAINT uq_article_resource UNIQUE (article_id, resource_id)
);

-- admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category_status ON articles(category, status);
CREATE INDEX IF NOT EXISTS idx_articles_parent ON articles(parent_id);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured, status);
CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(type);

CREATE INDEX IF NOT EXISTS idx_article_contents_article ON article_contents(article_id);
CREATE INDEX IF NOT EXISTS idx_article_contents_slug ON article_contents(slug);
CREATE INDEX IF NOT EXISTS idx_article_contents_lang_slug ON article_contents(lang, slug);

CREATE INDEX IF NOT EXISTS idx_relations_from ON article_relations(from_article_id, type);
CREATE INDEX IF NOT EXISTS idx_relations_to ON article_relations(to_article_id);

CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);

-- Función y trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
