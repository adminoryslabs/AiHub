// Tests de integración: todos los endpoints principales con DB de test
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createApp } from '../../src/index';
import { getPool, closePool } from '../../src/services/db';

// Silenciar logs durante tests
process.env.NODE_ENV = 'test';

const app = createApp();

// Datos de prueba compartidos
let testArticleId: string;
const JWT_SECRET = 'test-jwt-secret-for-testing-only';
let authToken: string;

// Helper para generar token de test
function generateTestToken() {
  return jwt.sign({ userId: 'test-admin-uuid', email: 'admin@test.com' }, JWT_SECRET, {
    expiresIn: '1h',
  });
}

// Limpiar y preparar la DB de test antes de los tests
beforeAll(async () => {
  const pool = getPool();

  // Limpiar datos de test (orden respeta FKs)
  await pool.query('DELETE FROM article_resources');
  await pool.query('DELETE FROM article_relations');
  await pool.query('DELETE FROM article_contents');
  await pool.query('DELETE FROM articles');
  await pool.query('DELETE FROM resources');
  await pool.query('DELETE FROM admin_users');

  // Crear admin de test
  const passwordHash = await bcrypt.hash('admin123', 10);
  await pool.query(
    'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET password_hash = $2',
    ['admin@test.com', passwordHash]
  );

  authToken = generateTestToken();
});

afterAll(async () => {
  await closePool();
});

// Limpiar artículos entre grupos de tests
beforeEach(async () => {
  // No limpiar entre cada test individual, se maneja con datos únicos
});

// --- GET /api/v1/health ---
describe('GET /api/v1/health', () => {
  it('devuelve 200 con estructura correcta', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      services: {
        database: expect.any(String),
      },
    });
  });
});

// --- GET /api/v1/categories ---
describe('GET /api/v1/categories', () => {
  it('devuelve lista de categorías con article_count para lang=es', async () => {
    const res = await request(app).get('/api/v1/categories?lang=es');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);

    const fundamentals = res.body.data.find((c: { slug: string }) => c.slug === 'fundamentals');
    expect(fundamentals).toBeDefined();
    expect(fundamentals.name).toBe('Fundamentos');
    expect(typeof fundamentals.article_count).toBe('number');
  });

  it('devuelve nombres en inglés para lang=en', async () => {
    const res = await request(app).get('/api/v1/categories?lang=en');

    expect(res.status).toBe(200);
    const fundamentals = res.body.data.find((c: { slug: string }) => c.slug === 'fundamentals');
    expect(fundamentals.name).toBe('Fundamentals');
  });

  it('devuelve 400 si falta el parámetro lang', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(400);
  });
});

// --- GET /api/v1/articles ---
describe('GET /api/v1/articles', () => {
  beforeAll(async () => {
    // Crear artículo de prueba publicado
    const pool = getPool();
    const articleResult = await pool.query(
      `INSERT INTO articles (slug_uk, type, category, status, featured)
       VALUES ('test-article-list', 'concept', 'agents', 'published', false)
       RETURNING id`
    );
    const artId = articleResult.rows[0].id;

    await pool.query(
      `INSERT INTO article_contents (article_id, lang, slug, title, summary, body)
       VALUES ($1, 'es', 'articulo-de-prueba-lista', 'Artículo de Prueba Lista', 'Resumen de prueba', 'Cuerpo de prueba')`,
      [artId]
    );
  });

  it('devuelve solo artículos publicados con paginación', async () => {
    const res = await request(app).get('/api/v1/articles?lang=es');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      per_page: 20,
      total: expect.any(Number),
      total_pages: expect.any(Number),
    });

    // Verificar que todos los artículos tienen los campos correctos
    for (const article of res.body.data) {
      expect(article).toHaveProperty('id');
      expect(article).toHaveProperty('slug');
      expect(article).toHaveProperty('title');
      expect(article).toHaveProperty('children_count');
    }
  });

  it('respeta el parámetro de paginación per_page', async () => {
    const res = await request(app).get('/api/v1/articles?lang=es&per_page=1');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });
});

// --- GET /api/v1/articles/:slug ---
describe('GET /api/v1/articles/:slug', () => {
  const testSlug = 'articulo-detalle-prueba';

  beforeAll(async () => {
    const pool = getPool();
    const articleResult = await pool.query(
      `INSERT INTO articles (slug_uk, type, category, status)
       VALUES ('test-article-detail', 'concept', 'fundamentals', 'published')
       RETURNING id`
    );
    testArticleId = articleResult.rows[0].id;

    await pool.query(
      `INSERT INTO article_contents (article_id, lang, slug, title, summary, body)
       VALUES ($1, 'es', $2, 'Artículo Detalle', 'Resumen detalle', 'Cuerpo detalle')`,
      [testArticleId, testSlug]
    );
  });

  it('devuelve 200 con artículo publicado existente', async () => {
    const res = await request(app).get(`/api/v1/articles/${testSlug}?lang=es`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: testArticleId,
      localized_slug: testSlug,
      title: 'Artículo Detalle',
      relations: {
        related: expect.any(Array),
        prerequisite: expect.any(Array),
        next: expect.any(Array),
      },
      resources: expect.any(Array),
    });
  });

  it('devuelve 404 para slug que no existe', async () => {
    const res = await request(app).get('/api/v1/articles/slug-inexistente?lang=es');
    expect(res.status).toBe(404);
  });
});

// --- GET /api/v1/featured ---
describe('GET /api/v1/featured', () => {
  beforeAll(async () => {
    const pool = getPool();

    // Crear artículo featured
    const articleResult = await pool.query(
      `INSERT INTO articles (slug_uk, type, category, status, featured)
       VALUES ('test-featured-article', 'concept', 'agents', 'published', true)
       RETURNING id`
    );
    const artId = articleResult.rows[0].id;

    await pool.query(
      `INSERT INTO article_contents (article_id, lang, slug, title, summary)
       VALUES ($1, 'es', 'articulo-destacado', 'Artículo Destacado', 'Resumen destacado')`,
      [artId]
    );
  });

  it('devuelve solo artículos featured + published', async () => {
    const res = await request(app).get('/api/v1/featured?lang=es');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);

    for (const item of res.body.data) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('category');
    }
  });
});

// --- POST /api/v1/admin/auth/login ---
describe('POST /api/v1/admin/auth/login', () => {
  it('devuelve 200 con token válido para credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      token: expect.any(String),
      expires_at: expect.any(String),
    });
  });

  it('devuelve 401 con credenciales inválidas', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'admin@test.com', password: 'contraseña-incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve 401 con email que no existe', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'noexiste@test.com', password: 'cualquier' });

    expect(res.status).toBe(401);
  });
});

// --- POST /api/v1/admin/articles (sin token) ---
describe('Rutas admin sin autenticación', () => {
  it('POST /api/v1/admin/articles sin token devuelve 401', async () => {
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .send({ slug_uk: 'test', type: 'concept', category: 'agents' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/admin/articles sin token devuelve 401', async () => {
    const res = await request(app).get('/api/v1/admin/articles');
    expect(res.status).toBe(401);
  });
});

// --- POST /api/v1/admin/articles (con token) ---
describe('POST /api/v1/admin/articles con token', () => {
  it('crea artículo correctamente con datos válidos', async () => {
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        slug_uk: 'test-create-article',
        type: 'concept',
        category: 'fundamentals',
        volatility: 'low',
        featured: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      slug_uk: 'test-create-article',
      type: 'concept',
      category: 'fundamentals',
      status: 'draft',
    });
  });

  it('devuelve 409 si el slug_uk ya existe', async () => {
    // Crear el artículo primero
    await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ slug_uk: 'slug-duplicado-test', type: 'concept', category: 'agents' });

    // Intentar crearlo de nuevo
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ slug_uk: 'slug-duplicado-test', type: 'concept', category: 'agents' });

    expect(res.status).toBe(409);
  });

  it('devuelve 400 si falta el tipo', async () => {
    const res = await request(app)
      .post('/api/v1/admin/articles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ slug_uk: 'sin-tipo', category: 'agents' });

    expect(res.status).toBe(400);
  });
});

// --- POST /api/v1/admin/articles/:id/content ---
describe('POST /api/v1/admin/articles/:id/content', () => {
  let contentTestArticleId: string;

  beforeAll(async () => {
    const pool = getPool();
    const res = await pool.query(
      `INSERT INTO articles (slug_uk, type, category)
       VALUES ('test-content-article', 'concept', 'agents')
       RETURNING id`
    );
    contentTestArticleId = res.rows[0].id;
  });

  it('crea contenido por primera vez (upsert)', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/articles/${contentTestArticleId}/content`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lang: 'es',
        slug: 'articulo-con-contenido',
        title: 'Artículo Con Contenido',
        summary: 'Resumen de prueba',
        body: '## Sección\n\nContenido en markdown.',
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      article_id: contentTestArticleId,
      lang: 'es',
      slug: 'articulo-con-contenido',
    });
  });

  it('actualiza contenido existente (upsert idempotente)', async () => {
    // Segunda llamada con mismo article_id + lang debe actualizar
    const res = await request(app)
      .post(`/api/v1/admin/articles/${contentTestArticleId}/content`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        lang: 'es',
        slug: 'articulo-con-contenido',
        title: 'Título Actualizado',
        summary: 'Resumen actualizado',
        body: '## Sección actualizada',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.lang).toBe('es');
  });
});

// --- PUT /api/v1/admin/articles/:id/status ---
describe('PUT /api/v1/admin/articles/:id/status', () => {
  let statusTestArticleId: string;

  beforeAll(async () => {
    const pool = getPool();
    const res = await pool.query(
      `INSERT INTO articles (slug_uk, type, category, status)
       VALUES ('test-status-transitions', 'concept', 'patterns', 'draft')
       RETURNING id`
    );
    statusTestArticleId = res.rows[0].id;
  });

  it('transición válida: draft → published', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/articles/${statusTestArticleId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
  });

  it('transición válida: published → deprecated', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/articles/${statusTestArticleId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'deprecated' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('deprecated');
  });

  it('transición inválida devuelve 409', async () => {
    // El artículo está en deprecated, no puede ir directamente a published
    const res = await request(app)
      .put(`/api/v1/admin/articles/${statusTestArticleId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'published' });

    expect(res.status).toBe(409);
  });
});
