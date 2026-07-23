// Tests de integración: endpoints de tutoriales y validación admin de tipos
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/index';
import { getPool, closePool } from '../../src/services/db';

// Silenciar logs durante tests
process.env.NODE_ENV = 'test';

const app = createApp();

const JWT_SECRET = 'test-jwt-secret-for-testing-only';
let authToken: string;
const TEST_SUPERADMIN_ROLE_ID = '11111111-1111-4111-8111-111111111111';
const TEST_ADMIN_USER_ID = '22222222-2222-4222-8222-222222222222';

function generateTestToken() {
  return jwt.sign({
    userId: TEST_ADMIN_USER_ID,
    email: 'admin@test.com',
    role: { id: TEST_SUPERADMIN_ROLE_ID, slug: 'superadmin', name: 'Superadmin' },
    permissions: [
      'article.create',
      'article.edit',
      'article.review',
      'article.publish',
      'article.delete',
      'resource.manage',
      'image.upload',
      'access.manage',
    ],
  }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

// Preparar la DB con las columnas necesarias para tutoriales
beforeAll(async () => {
  const pool = getPool();

  // Preparar schema base (mismo setup que api.test.ts)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY,
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
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role_id UUID NOT NULL REFERENCES roles(id),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Agregar columnas de migración 005 si no existen
  await pool.query(`
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE articles ADD COLUMN difficulty VARCHAR(15);
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
      BEGIN
        ALTER TABLE articles ADD COLUMN estimated_time VARCHAR(50);
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
      BEGIN
        ALTER TABLE articles ADD COLUMN created_by UUID NULL;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
      BEGIN
        ALTER TABLE articles ADD COLUMN updated_by UUID NULL;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
      BEGIN
        ALTER TABLE articles
          ADD CONSTRAINT articles_difficulty_check
          CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced'));
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END $$;
  `);

  // Eliminar constraint viejo de type si existe y crear el nuevo
  await pool.query(`
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

      BEGIN
        ALTER TABLE articles
          ADD CONSTRAINT articles_type_check
          CHECK (type IN ('concept', 'tutorial'));
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END $$;
  `);

  // Limpiar datos
  await pool.query('DELETE FROM article_resources');
  await pool.query('DELETE FROM article_relations');
  await pool.query('DELETE FROM article_contents');
  await pool.query('DELETE FROM articles');
  await pool.query('DELETE FROM resources');
  await pool.query('DELETE FROM role_permissions');
  await pool.query('DELETE FROM permissions');
  await pool.query('DELETE FROM users');
  await pool.query('DELETE FROM roles');

  // Crear rol y permisos
  await pool.query(
    `INSERT INTO roles (id, slug, name) VALUES ($1, 'superadmin', 'Superadmin')`,
    [TEST_SUPERADMIN_ROLE_ID]
  );

  await pool.query(
    `INSERT INTO permissions (key, description)
     VALUES
      ('article.create', 'Crear artículos'),
      ('article.edit', 'Editar artículos'),
      ('article.review', 'Revisar artículos'),
      ('article.publish', 'Publicar artículos'),
      ('article.delete', 'Eliminar artículos'),
      ('resource.manage', 'Gestionar recursos'),
      ('image.upload', 'Subir imágenes'),
      ('access.manage', 'Gestionar accesos')`
  );

  await pool.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT $1, id FROM permissions`,
    [TEST_SUPERADMIN_ROLE_ID]
  );

  // Crear admin de test
  const passwordHash = await bcrypt.hash('admin123', 10);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3, role_id = $4, is_active = true`,
    [TEST_ADMIN_USER_ID, 'admin@test.com', passwordHash, TEST_SUPERADMIN_ROLE_ID]
  );

  authToken = generateTestToken();

  // Crear tutoriales de prueba
  const pool2 = getPool();

  // Tutorial 1: beginner
  const t1 = await pool2.query(
    `INSERT INTO articles (slug_uk, type, difficulty, estimated_time, category, status)
     VALUES ('test-tutorial-beginner', 'tutorial', 'beginner', '15 min', 'agents', 'published')
     RETURNING id`
  );
  await pool2.query(
    `INSERT INTO article_contents (article_id, lang, slug, title, summary, body)
     VALUES ($1, 'es', 'tutorial-principiante', 'Tutorial Principiante', 'Resumen principiante', 'Cuerpo tutorial')`,
    [t1.rows[0].id]
  );

  // Tutorial 2: intermediate
  const t2 = await pool2.query(
    `INSERT INTO articles (slug_uk, type, difficulty, estimated_time, category, status)
     VALUES ('test-tutorial-intermediate', 'tutorial', 'intermediate', '30 min', 'tools', 'published')
     RETURNING id`
  );
  await pool2.query(
    `INSERT INTO article_contents (article_id, lang, slug, title, summary, body)
     VALUES ($1, 'es', 'tutorial-intermedio', 'Tutorial Intermedio', 'Resumen intermedio', 'Cuerpo tutorial 2')`,
    [t2.rows[0].id]
  );

  // Concepto de prueba (para verificar 404 en /tutorials/:slug)
  const c1 = await pool2.query(
    `INSERT INTO articles (slug_uk, type, category, status)
     VALUES ('test-concept-for-tutorial', 'concept', 'fundamentals', 'published')
     RETURNING id`
  );
  await pool2.query(
    `INSERT INTO article_contents (article_id, lang, slug, title, summary, body)
     VALUES ($1, 'es', 'concepto-no-tutorial', 'Concepto No Tutorial', 'Resumen concepto', 'Cuerpo concepto')`,
    [c1.rows[0].id]
  );
});

afterAll(async () => {
  await closePool();
});

// --- GET /api/v1/tutorials ---
describe('GET /api/v1/tutorials', () => {
  it('devuelve lista paginada de tutoriales', async () => {
    const res = await request(app).get('/api/v1/tutorials?lang=es');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      per_page: 20,
      total: expect.any(Number),
    });

    // Verificar campos de tutorial
    for (const tutorial of res.body.data) {
      expect(tutorial).toHaveProperty('difficulty');
      expect(tutorial).toHaveProperty('estimated_time');
      expect(tutorial).toHaveProperty('title');
    }
  });

  it('filtra por difficulty', async () => {
    const res = await request(app).get('/api/v1/tutorials?lang=es&difficulty=beginner');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const tutorial of res.body.data) {
      expect(tutorial.difficulty).toBe('beginner');
    }
  });

  it('devuelve 400 para difficulty inválido', async () => {
    const res = await request(app).get('/api/v1/tutorials?lang=es&difficulty=expert');
    expect(res.status).toBe(400);
  });
});

// --- GET /api/v1/tutorials/:slug ---
describe('GET /api/v1/tutorials/:slug', () => {
  it('devuelve detalle de tutorial con difficulty y estimated_time', async () => {
    const res = await request(app).get('/api/v1/tutorials/tutorial-principiante?lang=es');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      localized_slug: 'tutorial-principiante',
      difficulty: 'beginner',
      estimated_time: '15 min',
      relations: {
        related: expect.any(Array),
        prerequisite: expect.any(Array),
        next: expect.any(Array),
      },
    });
  });

  it('devuelve 404 para un artículo que es concept, no tutorial', async () => {
    const res = await request(app).get('/api/v1/tutorials/concepto-no-tutorial?lang=es');
    expect(res.status).toBe(404);
  });

  it('devuelve alternate_lang con namespace /tutoriales/ o /tutorials/', async () => {
    // Crear un tutorial con contenido en ambos idiomas para probar alternate_lang
    const pool = getPool();
    const t = await pool.query(
      `INSERT INTO articles (slug_uk, type, difficulty, estimated_time, category, status)
       VALUES ('test-tutorial-bilingual', 'tutorial', 'advanced', '45 min', 'patterns', 'published')
       RETURNING id`
    );
    await pool.query(
      `INSERT INTO article_contents (article_id, lang, slug, title, summary, body)
       VALUES ($1, 'es', 'tutorial-bilingue', 'Tutorial Bilingüe', 'Resumen', 'Cuerpo'),
              ($1, 'en', 'bilingual-tutorial', 'Bilingual Tutorial', 'Summary', 'Body')`,
      [t.rows[0].id]
    );

    const res = await request(app).get('/api/v1/tutorials/tutorial-bilingue?lang=es');
    expect(res.status).toBe(200);
    expect(res.body.data.alternate_lang).toMatchObject({
      lang: 'en',
      slug: 'bilingual-tutorial',
    });
    expect(res.body.data.alternate_lang.url).toContain('/en/tutorials/');
  });
});

// --- POST /api/v1/admin/articles (tutorial validation) ---
describe('POST /api/v1/admin/articles — validación de tutorial', () => {
  it('crea tutorial con difficulty y estimated_time → 201', async () => {
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        slug_uk: 'test-tutorial-valid',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimated_time: '25 min',
        category: 'agents',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('tutorial');
  });

  it('tutorial sin difficulty → 400', async () => {
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        slug_uk: 'test-tutorial-no-difficulty',
        type: 'tutorial',
        estimated_time: '20 min',
        category: 'agents',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('difficulty');
  });

  it('tutorial sin estimated_time → 400', async () => {
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        slug_uk: 'test-tutorial-no-time',
        type: 'tutorial',
        difficulty: 'beginner',
        category: 'agents',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('estimated_time');
  });

  it('concept con difficulty → 400', async () => {
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        slug_uk: 'test-concept-with-difficulty',
        type: 'concept',
        difficulty: 'beginner',
        category: 'fundamentals',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('concept');
  });

  it('concept con estimated_time → 400', async () => {
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        slug_uk: 'test-concept-with-time',
        type: 'concept',
        estimated_time: '30 min',
        category: 'fundamentals',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('concept');
  });

  it('rechaza type: tool-branch → 400', async () => {
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        slug_uk: 'test-tool-branch-rejected',
        type: 'tool-branch',
        category: 'tools',
      });

    expect(res.status).toBe(400);
  });

  it('acepta applicable_as_of para cualquier type', async () => {
    // Concept con applicable_as_of
    const resConcept = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        slug_uk: 'test-concept-applicable',
        type: 'concept',
        category: 'tools',
      });
    expect(resConcept.status).toBe(201);

    // Tutorial con applicable_as_of
    const resTutorial = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        slug_uk: 'test-tutorial-applicable',
        type: 'tutorial',
        difficulty: 'advanced',
        estimated_time: '1 hour',
        category: 'tools',
      });
    expect(resTutorial.status).toBe(201);
  });
});
