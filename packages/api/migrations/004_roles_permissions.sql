BEGIN;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

INSERT INTO permissions (key, description)
VALUES
  ('article.create', 'Crear artículos'),
  ('article.edit', 'Editar metadatos y contenidos de artículos'),
  ('article.review', 'Enviar artículos a revisión y devolverlos a borrador'),
  ('article.publish', 'Publicar y administrar estados post-publicación'),
  ('article.delete', 'Eliminar artículos'),
  ('resource.manage', 'Gestionar recursos externos y sus vínculos'),
  ('image.upload', 'Subir imágenes al storage'),
  ('access.manage', 'Gestionar usuarios, roles y permisos')
ON CONFLICT (key) DO NOTHING;

INSERT INTO roles (slug, name, is_system)
VALUES
  ('superadmin', 'Superadmin', true),
  ('editor', 'Editor', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'article.create',
  'article.edit',
  'article.review',
  'article.publish',
  'article.delete',
  'resource.manage',
  'image.upload',
  'access.manage'
)
WHERE r.slug = 'superadmin'
ON CONFLICT ON CONSTRAINT uq_role_permission DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.key IN (
  'article.create',
  'article.edit',
  'article.review',
  'resource.manage',
  'image.upload'
)
WHERE r.slug = 'editor'
ON CONFLICT ON CONSTRAINT uq_role_permission DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO users (id, email, password_hash, role_id, is_active, created_at, updated_at)
SELECT au.id, au.email, au.password_hash, r.id, true, au.created_at, now()
FROM admin_users au
JOIN roles r ON r.slug = 'superadmin'
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role_id = EXCLUDED.role_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();

ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_status_check;

ALTER TABLE articles
  ADD CONSTRAINT articles_status_check
  CHECK (status IN ('draft', 'in_review', 'published', 'deprecated'));

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS review_requested_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

ALTER TABLE article_contents
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS last_verified_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(key);

CREATE OR REPLACE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TABLE IF EXISTS admin_users;

COMMIT;
