# Design: add-tutorials-type

## Technical Approach

Se transforma el eje `type` de `concept | tool-branch` a `concept | tutorial`. La implementación se divide en 4 chained PRs que respetan el principio "fundación primero" del SDD agreement de AI Hub. Cada PR es autónomo y deployable independientemente.

No se añade un cuarto tipo de relación (`implements`). La sección "Implementaciones por herramienta" se elimina del modelo. Las relaciones tutorial↔concept usan `prerequisite` (tutorial→concept), idéntico al modelo actual. Los artículos que antes aparecían como `tool_branches` vía `parent_id` ahora se vinculan con relaciones explícitas en `article_relations`.

---

## Architecture Decisions

### Decision: URL de tutorial — `/tutoriales/{slug}` en vez de `/{category}/{slug}`

**Choice**: Namespace propio `/es/tutoriales/{slug}` y `/en/tutorials/{slug}`.

**Alternatives considered**: 
- `/{lang}/tutorials/{slug}` — mismo esquema que conceptos, pero forzaría que todos los tutorials pertenecieran a la categoría `tools`.
- `/{lang}/{category}/{slug}` con badge "tutorial" — confuso; dos tipos de artículo comparten namespace.

**Rationale**: Los tutorials no pertenecen a una sola categoría; un tutorial puede referirse a Agents, MCP, Patterns, etc. El namespace transversal refleja esta naturaleza mejor que forzar `category=tools`. La URL también comunica inmediatamente al lector que es un tutorial, no un concepto.

### Decision: Eliminar `parent_id` y usar solo `article_relations`

**Choice**: `ALTER TABLE articles DROP COLUMN parent_id`. Todas las relaciones entre artículos se gestionan exclusivamente vía `article_relations`.

**Alternatives considered**: Mantener `parent_id` para retrocompatibilidad con tutorials hijo-de-concepto. Rechazado porque `article_relations` ya cubre el caso con `prerequisite`.

**Rationale**: `parent_id` era un single-link implícito para `tool-branch` → `concept`. Con `article_relations` tenemos relación tipada explícita, direccional y sin ambigüedad. Un tutorial "MCP en Claude Code" puede declarar `prerequisite: what-is-mcp` y eso es suficiente. No necesitamos dos mecanismos para el mismo propósito.

### Decision: Mantener `applicable_as_of` disponible para cualquier `type`

**Choice**: El campo `applicable_as_of` no tiene restricción por tipo.

**Rationale**: El campo nunca fue específico de `tool-branch` — simplemente todos los artículos que lo usaban eran de ese tipo. Un concepto sobre "MCP" que menciona versiones específicas de herramientas puede declarar `applicable_as_of: "julio 2026"` con total validez editorial.

### Decision: No existe la sección "Implementaciones por herramienta" en el nuevo modelo

**Choice**: Los conceptos NO tienen una sección "Implementaciones por herramienta" en el nuevo modelo — ni auto-generada ni escrita a mano. El cross-linking entre un concept y sus tutorials relacionados se hace exclusivamente vía la sección canónica **"Relacionados"** (renderizada por el frontend desde `article_relations.type = 'related'` y/o `'prerequisite'`). No hay un cuarto tipo de relación implícito.

**Alternatives considered**:
- Auto-generar la sección recorriendo `article_relations` filtradas por type=tutorial. Rechazado: sería una cuarta semántica de relación implícita ("prerequisite + type=tutorial = implementación"), frágil y confusa.
- Mantener la sección como h2 en el markdown que el autor escribe a mano. Rechazado: era placeholder para listar tool-branches; con `tool-branch` eliminado no tiene razón de ser.
- Eliminar `## Implementaciones por herramienta` de la estructura canónica de concept (en `article-guidelines.md`). **Elegido**: la sección simplemente no existe.

**Rationale**: El sistema de 3 tipos de relación (`related`, `prerequisite`, `next`) ya cubre todo el cross-linking necesario. Inventar un cuarto comportamiento implícito agrega complejidad sin valor. Si un editor quiere destacar tutorials relacionados a un concept, lo hace vía la pestaña "Relaciones" del panel admin, y el frontend los renderiza en "Relacionados".

---

## Data Flow

```
Admin importa .md                          Lector visita /es/tutoriales/{slug}
     │                                              │
     ▼                                              ▼
POST /admin/articles                      GET /public/tutorials/{slug}?lang=es
  body: { type: "tutorial",                     │
          difficulty: "intermediate",            ▼
          estimated_time: "30 min" }     Next.js SSR → fetch Express
     │                                         │
     ▼                                         ▼
Express valida con Zod              Express: JOIN articles + article_contents
  (difficulty requerido                    + article_relations (prerequisite)
   si type=tutorial)                        → renderiza Article con
     │                                      tutorial: { difficulty,
     ▼                                                 estimated_time,
INSERT → PostgreSQL                             body → markdownToHtml }
     │                                              │
     ▼                                              ▼
Meilisearch reindex                    TutorialRenderer (client component)
  (documento con type="tutorial")        renderiza pasos numerados,
     │                                   verificación por paso,
     ▼                                   badges difficulty + time
Búsqueda funcional con nuevo type
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/api/migrations/002_tutorials_type.sql` | Create | Migración: DROP CHECK, ADD CHECK, DROP parent_id, ADD difficulty/estimated_time, UPDATE 8 artículos |
| `packages/shared/src/types/article.ts` | Modify | `ArticleType` → `'concept' \| 'tutorial'`. `AdminArticle` elimina `parent_id`, agrega `difficulty`, `estimated_time`. `Article` elimina `parent` y `tool_branches`, agrega `difficulty`, `estimated_time`. |
| `packages/api/src/routes/admin/articles.ts` | Modify | Zod schemas: `type` enum a `'concept' \| 'tutorial'`. Nuevos campos `difficulty`/`estimated_time` en CreateArticleSchema y UpdateArticleSchema. Eliminar validación de `parent_id` (líneas 277-282). Eliminar consulta de children vía `parent_id` (líneas 370-382). Eliminar `children_count` subquery (líneas 164-168). |
| `packages/api/src/routes/public/articles.ts` | Modify | ListQuerySchema: `type` enum actualizado, eliminar `parent_id`. Detalle: eliminar `tool_branches` query (líneas 158-174) y `parent` query (líneas 177-194). Agregar `difficulty`/`estimated_time` al SELECT. El endpoint `/public/articles` sigue listando conceptos; los tutorials tienen su propio endpoint. |
| `packages/api/src/routes/public/tutorials.ts` | Create | Nuevo endpoint: `GET /public/tutorials` (listado paginado, filtro `difficulty`) y `GET /public/tutorials/:slug` (detalle, por slug localizado). |
| `packages/api/src/routes/public/sitemap.ts` | Modify | Las URLs de tutorial usan `/es/tutoriales/` y `/en/tutorials/` en vez de `/{lang}/{category}/`. Detectar `type` del artículo para construir la URL correcta. |
| `packages/api/src/services/meilisearch.ts` | Modify | Campo `type` ya es filterable — sin cambios de schema. Agregar `difficulty` como filterable. Estrategia de reindex: full reindex post-migración. |
| `packages/web/app/(public)/[lang]/tutoriales/[slug]/page.tsx` | Create | Página de tutorial: SSR con `getPublicTutorial(slug, lang)`. Renderiza TutorialRenderer. Metadata con hreflang. |
| `packages/web/app/(public)/[lang]/tutoriales/page.tsx` | Create | Listado de tutorials: paginado, filtro por difficulty. Similar a `[lang]/[category]/page.tsx`. |
| `packages/web/components/article/TutorialRenderer.tsx` | Create | Renderizador de tutorial: parsea `## Pasos` en step cards numeradas con bloque de verificación. Renderiza badges de `difficulty` + `estimated_time`. Soporta `## Troubleshooting` colapsable. |
| `packages/web/components/layout/SidebarLeft.tsx` | Modify | Agrega sección "Tutoriales" / "Tutorials" con sub-filtro por difficulty (Principiante/Intermedio/Avanzado). |
| `packages/web/lib/i18n.ts` | Modify | Nueva función `buildTutorialUrl(lang, slug)`. Actualizar `buildArticleUrl` para distinguir concept vs tutorial. |
| `packages/web/lib/api-client.ts` | Modify | Nuevas funciones `getTutorials(params)` y `getTutorial(slug, lang)`. Actualizar `getArticle` para manejar `difficulty` y `estimated_time` en la respuesta. |
| `packages/web/lib/admin-api-client.ts` | Modify | Actualizar `createArticle` para aceptar `difficulty` y `estimated_time`. Tipo `type` ahora `'concept' | 'tutorial'`. Eliminar `parent_id`. |
| `packages/web/app/(admin)/admin/articles/new/page.tsx` | Modify | Selector de tipo: "Concepto" / "Tutorial". Eliminar selector de `parent_id`. Condicional: si type=tutorial, mostrar campos `difficulty` (select) y `estimated_time` (text). |
| `packages/web/app/(admin)/admin/articles/[id]/page.tsx` | Modify | Tab metadata: eliminar `parent_id`, agregar `difficulty`/`estimated_time`. |
| `packages/web/app/(admin)/admin/articles/page.tsx` | Modify | Filtro de tipo: `concept` / `tutorial`. Columna `difficulty` en tabla. Eliminar `children_count` del tipo. |
| `docs/hub_prd.md` | Modify | §6.1, §6.2, §6.5, §7 — actualizar tipos, estructura de tutorial, categorías, modelo de datos. |
| `docs/hub_vision.md` | Modify | §5.1, §5.3, §5.4 — actualizar estructura en árbol, anatomía, categorías. |
| `docs/article-guidelines.md` | Modify | §1 (tipos), §2 (estructura tutorial), §3 (metadatos: difficulty/estimated_time), §9 (checklist), §10 (revertir: tutorials SÍ son parte del Hub). |
| `docs/context-summary.md` | Modify | "Modelo de contenido" y "Tipos de artículo". |

---

## 1. Migration SQL

### New file: `packages/api/migrations/002_tutorials_type.sql`

```sql
-- Migración 002: reemplazar tool-branch por tutorial, eliminar parent_id
-- Requiere: 001_initial_schema.sql ejecutada previamente
-- Ejecutar: psql $DATABASE_URL -f 002_tutorials_type.sql
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
```

### Down migration

```sql
-- Rollback de 002_tutorials_type.sql
BEGIN;

-- 1. Restaurar parent_id
ALTER TABLE articles ADD COLUMN parent_id UUID REFERENCES articles(id) ON DELETE SET NULL;

-- 2. Restaurar type a tool-branch en los 8 artículos
UPDATE articles SET type = 'tool-branch', difficulty = NULL, estimated_time = NULL
WHERE slug_uk IN (
  'claude-code-for-testing', 'getting-started-with-claude-design',
  'stitch-infinite-canvas', 'stitch-screen-by-screen',
  'stitch', 'warp-terminal', 'stitch-vs-figma', 'subagents-in-claude-code'
);

-- 3. Eliminar CHECK actual
DO $$ ... $$; -- (mismo patrón que en UP)

-- 4. Restaurar CHECK original
ALTER TABLE articles
  ADD CONSTRAINT articles_type_check
  CHECK (type IN ('concept', 'tool-branch'));

-- 5. Eliminar columnas nuevas
ALTER TABLE articles DROP COLUMN difficulty, DROP COLUMN estimated_time;

-- 6. Restaurar índice parent_id
CREATE INDEX IF NOT EXISTS idx_articles_parent ON articles(parent_id);

-- 7. Eliminar índices nuevos
DROP INDEX IF EXISTS idx_articles_difficulty;
DROP INDEX IF EXISTS idx_articles_type_difficulty;

COMMIT;
```

### Migration ordering
1. **Ejecutar migración SQL** (002_tutorials_type.sql) contra la DB
2. **Desplegar API** con nuevos Zod schemas (PR 1)
3. **Reindexar Meilisearch** (full reindex de ~18 documentos, < 2 min)
4. **Desplegar frontend** (PRs 2-3)
5. **Actualizar docs** (PR 4)

La ventana entre step 1 y step 2 es mínima si se ejecuta en el mismo deploy. Durante esa ventana, `type: tool-branch` no existirá en la DB pero el viejo Zod schema aún lo espera → riesgo de error 500 en admin. **Mitigación**: empaquetar migración + API en el mismo PR (PR 1) y desplegar atómicamente.

---

## 2. API Changes

### 2.1 Zod Schema Diffs

**`admin/articles.ts` — CreateArticleSchema:**

```typescript
// ANTES
type: z.enum(['concept', 'tool-branch']),
parent_id: z.string().uuid().nullable().optional(),

// DESPUÉS
type: z.enum(['concept', 'tutorial']),
difficulty: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
estimated_time: z.string().max(50).nullable().optional(),
// parent_id ELIMINADO
```

**`admin/articles.ts` — UpdateArticleSchema:**

```typescript
// (ANTES no tenía difficulty/estimated_time ni parent_id — se agregan)
// DESPUÉS
difficulty: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
estimated_time: z.string().max(50).nullable().optional(),
```

**`admin/articles.ts` — ListQuerySchema (línea 20):**

```typescript
// ANTES
type: z.enum(['concept', 'tool-branch']).optional(),

// DESPUÉS
type: z.enum(['concept', 'tutorial']).optional(),
```

**`public/articles.ts` — ListQuerySchema:**

```typescript
// ANTES
type: z.enum(['concept', 'tool-branch']).optional(),
parent_id: z.string().uuid().optional(),

// DESPUÉS
type: z.enum(['concept', 'tutorial']).optional(),
// parent_id ELIMINADO
```

### 2.2 Validation rules (admin/articles.ts POST)

Eliminar bloque de validación de `parent_id` (líneas 277-288 actuales) y reemplazar con:

```typescript
// Validar reglas de tipo
if (type === 'tutorial') {
  if (!difficulty) {
    throw new ValidationError('difficulty es requerido para artículos de tipo tutorial');
  }
  if (!estimated_time) {
    throw new ValidationError('estimated_time es requerido para artículos de tipo tutorial');
  }
}
if (type === 'concept') {
  // difficulty y estimated_time deben ser null para conceptos
  if (difficulty) {
    throw new ValidationError('Los artículos de tipo concept no pueden tener difficulty');
  }
  if (estimated_time) {
    throw new ValidationError('Los artículos de tipo concept no pueden tener estimated_time');
  }
}
// applicable_as_of se acepta para cualquier type sin validación adicional
```

Y actualizar el INSERT (línea 297-300) para incluir `difficulty` y `estimated_time` y eliminar `parent_id`.

### 2.3 Cambios en GET detail (admin/articles.ts y public/articles.ts)

**admin GET `/:id`**: eliminar subquery de children (líneas 370-382 que usan `parent_id`). El campo `children` se elimina de la respuesta JSON. Agregar `difficulty`, `estimated_time` al SELECT.

**public GET `/:slug`**: eliminar query `tool_branches` (líneas 158-174) y query `parent` (líneas 177-194). Los campos `tool_branches` y `parent` se eliminan de la respuesta JSON. Agregar `a.difficulty`, `a.estimated_time` al SELECT. La URL del `alternate_lang` ahora debe construirse según el type: si `type = tutorial`, usar `/es/tutoriales/{slug}`.

### 2.4 Nuevo endpoint: `GET /public/tutorials`

**Archivo**: `packages/api/src/routes/public/tutorials.ts`

```typescript
// GET /api/v1/tutorials?lang=es&difficulty=intermediate&page=1&per_page=20
const ListQuerySchema = z.object({
  lang: z.enum(['es', 'en']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});

// Query: SELECT a.*, ac.* FROM articles a
//   JOIN article_contents ac ON ac.article_id = a.id AND ac.lang = $1
//   WHERE a.type = 'tutorial' AND a.status = 'published'
//   AND ($2::varchar IS NULL OR a.difficulty = $2)
//   ORDER BY ac.last_edited_at DESC LIMIT $3 OFFSET $4

// Response shape:
// {
//   data: [{ id, slug, localized_slug, title, summary, difficulty, estimated_time,
//            category, domains, last_edited_at }],
//   pagination: { page, per_page, total, total_pages }
// }
```

### 2.5 Nuevo endpoint: `GET /public/tutorials/:slug`

```typescript
// GET /api/v1/tutorials/:slug?lang=es
// Similar a /articles/:slug pero filtra WHERE a.type = 'tutorial'
// Response shape: igual que Article (shared type) pero con difficulty y estimated_time
// alternate_lang.url usa /es/tutoriales/{slug} o /en/tutorials/{slug}
```

### 2.6 Meilisearch reindex strategy

**Estrategia**: Full reindex de todos los documentos. Menos de 20 artículos, < 2 minutos.

**Procedimiento**:
1. Ejecutar migración SQL
2. Llamar `setupMeilisearchIndex()` (vuelve a configurar filterableAttributes agregando `difficulty`)
3. Recorrer todos los artículos publicados y llamar `upsertDocument()` con los nuevos campos `type` y `difficulty`

**Idempotencia**: `upsertDocument` usa `primaryKey: 'document_id'` → re-ejecutar es seguro.

**Timing**: Dentro de la migración o como script post-deploy. Se ejecuta una vez, no en cada request.

### 2.7 Concrete test cases (Vitest)

Archivo: `packages/api/src/routes/public/__tests__/tutorials.test.ts` (nuevo)

```
describe('GET /api/v1/tutorials', () => {
  it('returns paginated tutorials filtered by lang', ...);
  it('filters by difficulty', ...);
  it('returns 400 for invalid difficulty', ...);
  it('returns empty array when no tutorials match', ...);
});

describe('GET /api/v1/tutorials/:slug', () => {
  it('returns tutorial detail with difficulty and estimated_time', ...);
  it('returns 404 for non-tutorial article', ...);
  it('returns alternate_lang URL with /tutoriales/ namespace', ...);
  it('returns prerequisite relations (not tool_branches)', ...);
});

describe('POST /api/v1/admin/articles (tutorial)', () => {
  it('creates tutorial with difficulty and estimated_time', ...);
  it('rejects tutorial without difficulty', ...);
  it('rejects tutorial without estimated_time', ...);
  it('rejects concept with difficulty set', ...);
  it('rejects type: tool-branch', ...);
  it('accepts applicable_as_of for any type', ...);
});
```

### 2.8 Backward compat

**Ventana de riesgo**: Entre ejecutar la migración SQL y desplegar la nueva API, `type: tool-branch` no existe en DB pero el viejo código admin podría intentar validarlo.

**Mitigación**: PR 1 empaqueta migración + API en un solo deploy. La columna `parent_id` se elimina en la migración → el viejo código que la lea fallará con "column does not exist". No hay ventana segura con despliegue parcial → **el deploy de PR 1 debe ser atómico** (migración + API en un solo commit/deploy).

---

## 3. Public Site Changes

### 3.1 Next.js routing (App Router confirmado)

Nuevas rutas:

```
packages/web/app/(public)/[lang]/tutoriales/
├── page.tsx          ← listado de tutorials (SSR)
└── [slug]/
    └── page.tsx      ← detalle de tutorial (SSR)
```

URL pública: `/es/tutoriales/mcp-en-claude-code` y `/en/tutorials/mcp-in-claude-code`.

**Verificación App Router**: El repo usa App Router (`app/` directory, `(public)/[lang]/[category]/[slug]/page.tsx`). Nuevas rutas siguen el mismo patrón: carpeta con `page.tsx`, parámetros vía `params: Promise<>`.

### 3.2 Data fetching

**SSR para tutorial detail**: `generateMetadata` y `default export` son server components → `getTutorial()` se ejecuta en el servidor (mismo patrón que `getArticle()`). Sin ISR por ahora (misma estrategia que conceptos: revalidate: 60 en el API client).

### 3.3 TutorialRenderer component

```typescript
// packages/web/components/article/TutorialRenderer.tsx
interface TutorialRendererProps {
  title: string;
  summary: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  applicableAsOf: string | null;
  html: string;            // HTML procesado por markdownToHtml()
  updatedMonth: string;
  slug: string;
  lang: string;
}

// Renderiza:
// 1. Header: badges [dificultad] [~30 min] [v jul 2026]
// 2. Summary
// 3. Body markdown (mismo ArticleRenderer)
// 4. Paso cards: parsea los <h2> dentro de "## Pasos" para generar
//    step cards numeradas si el markdown sigue la estructura canónica.
//    Si no, renderiza el HTML tal cual.
// 5. Troubleshooting colapsable: <details><summary>Troubleshooting</summary>...
```

El renderizado de pasos numerados se delega al markdown mismo — si el autor sigue la estructura canónica (`## Pasos\n\n### Paso 1: ...\n\n...\n\n**Verificación:** ...`), el HTML resultante ya tiene jerarquía visual. `TutorialRenderer` agrega los badges de difficulty/time arriba y opcionalmente un wrapper visual para los pasos.

### 3.4 Sidebar update (`SidebarLeft.tsx`)

Se agrega debajo de las 5 categorías conceptuales:

```tsx
{/* Sección Tutoriales */}
<div className="mt-3 pt-3 border-t border-outline-variant">
  <p className="px-3 pb-1 text-[11px] font-bold tracking-wide text-on-surface-variant">
    ~/tutoriales
  </p>
  {/* Sub-filtro por difficulty */}
  {['beginner', 'intermediate', 'advanced'].map((d) => (
    <Link
      key={d}
      href={`/${lang}/tutoriales?difficulty=${d}`}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-[12px] text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
    >
      <span aria-hidden="true">·</span>
      <span>{isEs ? DIFFICULTY_LABELS_ES[d] : DIFFICULTY_LABELS_EN[d]}</span>
    </Link>
  ))}
</div>
```

El componente recibe un nuevo prop opcional `currentTutorialDifficulty?: string`.

### 3.5 hreflang

En `[lang]/tutoriales/[slug]/page.tsx`, `generateMetadata` construye alternates con:

```typescript
alternates: {
  canonical: `${SITE_URL}/${lang}/tutoriales/${slug}`,
  languages: {
    es: `${SITE_URL}/es/tutoriales/${article.alternate_lang?.slug}`,
    en: `${SITE_URL}/en/tutorials/${article.alternate_lang?.slug}`,
  },
}
```

### 3.6 Sitemap (`packages/api/src/routes/public/sitemap.ts`)

El sitemap actual construye URLs con `{siteUrl}/{lang}/{category}/{slug}`. Se modifica para que detecte `type`:

```typescript
const generateUrl = (row) => {
  const loc = row.type === 'tutorial'
    ? `${siteUrl}/${row.lang}/${row.lang === 'es' ? 'tutoriales' : 'tutorials'}/${row.slug}`
    : `${siteUrl}/${row.lang}/${row.category}/${row.slug}`;
  // ... rest igual
};
```

El SELECT debe incluir `a.type` en la query.

### 3.7 Homepage featured tutorials

**No se agrega sección "Featured tutorials" en este cambio.** Los tutorials pueden ser `featured` y aparecer en la sección de destacados de la homepage junto a conceptos (el endpoint `GET /featured` no filtra por type), pero no se crea una sección separada. El stat del homepage ("N conceptos") debe actualizarse para contar ambos tipos o cambiar el label a "N artículos".

---

## 4. Admin Panel Changes

### 4.1 New article form (`admin/articles/new/page.tsx`)

**Type selector**: `concept` y `tutorial` (eliminar `tool-branch`). El label cambia:

```tsx
<select value={form.type} onChange={...}>
  <option value="concept">Concepto</option>
  <option value="tutorial">Tutorial</option>
</select>
```

**Campos condicionales** (reemplazan el antiguo selector de `parent_id`):

```tsx
{form.type === 'tutorial' && (
  <>
    <div>
      <label>Dificultad <span className="text-error">*</span></label>
      <select value={form.difficulty} required>
        <option value="">Seleccionar</option>
        <option value="beginner">Principiante</option>
        <option value="intermediate">Intermedio</option>
        <option value="advanced">Avanzado</option>
      </select>
    </div>
    <div>
      <label>Tiempo estimado <span className="text-error">*</span></label>
      <input type="text" placeholder="30 min" required />
    </div>
  </>
)}
```

El campo `applicable_as_of` sigue disponible para cualquier tipo (no se elimina). El estado del form agrega `difficulty: ''` y `estimated_time: ''`.

### 4.2 Edit article form (`admin/articles/[id]/page.tsx`)

Tab "Metadata":
- Eliminar campo `parent_id` de la UI
- Agregar `difficulty` (select) y `estimated_time` (input) — siempre visibles, editables
- `applicable_as_of` sigue presente

Los campos `difficulty` y `estimated_time` se persisten vía `updateArticle()` (que ya acepta campos nuevos en `UpdateArticleSchema`).

### 4.3 List view (`admin/articles/page.tsx`)

- Filtro de tipo: `concept` / `tutorial` (reemplaza `tool-branch`)
- Badge de tipo: `[concepto]` / `[tutorial]`
- Nueva columna opcional "Dificultad" (visible en desktop)

### 4.4 Content migration of 8 articles

La migración de los 8 artículos tiene **dos partes**: (a) SQL en la DB y (b) actualización de los archivos `articles/*/admin.md` correspondientes.

**SQL (ya cubierto en §1)**: `UPDATE articles SET type = ...` para los 8 artículos.

**Archivos `admin.md`**: existen 7 archivos `admin.md` para los 8 tool-branches (`claude-code-for-testing` confirmado). Cada uno debe actualizarse así:

| Artículo | `type` actual | `type` nuevo | `difficulty` | `estimated_time` | `parent` (eliminar) |
|----------|--------------|-------------|--------------|------------------|---------------------|
| `claude-code-for-testing/admin.md` | tool-branch | tutorial | intermediate | 20 min | `parent: ai-coding-agents` (eliminar línea) |
| `getting-started-with-claude-design/admin.md` | tool-branch | tutorial | intermediate | 25 min | eliminar si existe |
| `stitch-infinite-canvas/admin.md` | tool-branch | tutorial | intermediate | 20 min | eliminar si existe |
| `stitch-screen-by-screen/admin.md` | tool-branch | tutorial | intermediate | 20 min | eliminar si existe |
| `stitch/admin.md` | tool-branch | concept | — | — | eliminar si existe; `category: tools` se mantiene |
| `warp-terminal/admin.md` | tool-branch | concept | — | — | eliminar si existe; `category: tools` se mantiene |
| `stitch-vs-figma/admin.md` | tool-branch | concept | — | — | eliminar si existe; `category: tools` se mantiene |
| `subagents-in-claude-code/admin.md` | tool-branch | concept | — | — | eliminar si existe; `category: tools` se mantiene |

**Convención**: la línea `parent:` en `admin.md` se elimina. Si la relación padre-hijo es editorialmente valiosa (ej: `claude-code-for-testing` referenciaba `ai-coding-agents`), el admin debe recrearla manualmente como `prerequisite` en la pestaña Relaciones del panel admin, lo cual genera una fila en `article_relations`.

**Validación post-migración**:

```sql
-- Verificar que los 8 artículos tienen el type correcto
SELECT slug_uk, type, category, difficulty, estimated_time
FROM articles
WHERE slug_uk IN (
  'claude-code-for-testing', 'getting-started-with-claude-design',
  'stitch-infinite-canvas', 'stitch-screen-by-screen',
  'stitch', 'warp-terminal', 'stitch-vs-figma', 'subagents-in-claude-code'
);
-- Resultado esperado: 4 tutorial + 4 concept, los concept con category=tools

-- Verificar que no quedan artículos con type tool-branch
SELECT COUNT(*) = 0 AS no_tool_branch_left FROM articles WHERE type = 'tool-branch';
```

Y en disco:

```bash
# Verificar que ningún admin.md declara type: tool-branch
grep -l "type: tool-branch" articles/*/admin.md || echo "OK: no tool-branch en admin.md"
# Verificar que ningún admin.md declara parent:
grep -l "^  parent:" articles/*/admin.md || echo "OK: no parent: en admin.md"
```

---

## 5. Docs Updates (Concrete Diffs)

### 5.1 `hub_prd.md`

| Sección | Cambio |
|---------|--------|
| **§2 (Objetivos MVP)** | `soporte de estructura en árbol` → reemplazar con `soporte de artículos tipo concepto y tutorial con relaciones tipadas`. |
| **§6.1 (Artículos)** | Agregar tabla de estructura canónica de tutorial (Objetivo, Prerrequisitos, Pasos, Resultado esperado, Troubleshooting, Siguiente paso). Mantener tabla de concepto intacta. Eliminar tabla de "rama tool-specific". |
| **§6.2 (Estructura en árbol)** | Reemplazar completamente: `El sistema soporta relaciones tipadas entre artículos vía article_relations (related, prerequisite, next). Un tutorial puede declarar como prerequisite un concepto.` |
| **§6.5 (Categorías)** | La categoría `tools` sigue existiendo para artículos `concept` sobre herramientas (ej: stitch, warp-terminal). Agregar nota: `La sección Tutoriales no es una categoría — es un namespace transversal.` |
| **§6.10 (URLs)** | Agregar: `Los tutorials usan /es/tutoriales/{slug} y /en/tutorials/{slug}.` |
| **§7 (Modelo de datos)** | `Article.type`: `"concept" \| "tutorial"`. Eliminar `parent_id`. Agregar `difficulty`, `estimated_time`. `applicable_as_of` → `opcional para cualquier type`. |

### 5.2 `hub_vision.md`

| Sección | Cambio |
|---------|--------|
| **§5.1 (Estructura en árbol)** | Reemplazar diagrama de árbol con: `Los conceptos con implementaciones prácticas se vinculan a tutorials vía la relación prerequisite.` |
| **§5.3 (Anatomía rama tool-specific)** | Reemplazar completamente con `### 5.3 Anatomía de un tutorial` (tabla con las 6 secciones canónicas). |
| **§5.4 (Categorías)** | Agregar entrada: **Tutoriales** — Guías prácticas paso a paso, transversales a las categorías. |

### 5.3 `article-guidelines.md`

| Sección | Cambio |
|---------|--------|
| **§1 (Tipos)** | Eliminar §1.2 (tool-branch). Agregar §1.2 **Tutorial** (`type: tutorial`): Guía práctica paso a paso. Cubre un resultado específico. Tiene `difficulty` y `estimated_time`. |
| **§2 (Estructura)** | Eliminar §2.2 (Rama tool-specific). Agregar §2.2 **Estructura canónica de tutorial**: tabla con Objetivo, Prerrequisitos, Pasos, Resultado esperado, Troubleshooting, Siguiente paso (misma tabla del spec). |
| **§3 (Metadatos)** | `type` → `concept \| tutorial`. Eliminar `parent_id`. Agregar `difficulty` (`beginner \| intermediate \| advanced`, requerido para tutorial) y `estimated_time` (`string`, requerido para tutorial). `applicable_as_of` → `opcional para cualquier type, recomendado cuando es tool-specific`. |
| **§4 (Categorías)** | Mantener `tools` para conceptos sobre herramientas. Agregar nota al final: `Los tutorials no tienen categoría propia; se agrupan bajo la sección Tutoriales de la navegación.` |
| **§8 (Formato admin.md)** | Actualizar ejemplo YAML: `type: tutorial`, agregar `difficulty: intermediate`, `estimated_time: "30 min"`. Eliminar `applicable_as_of` del admin.md de ejemplo (ahora es universal). |
| **§9 (Checklist)** | Agregar items: `[ ] Si es tutorial, difficulty y estimated_time están informados`. `[ ] Si es tutorial, tiene secciones Objetivo, Prerrequisitos, Pasos, Resultado esperado`. Eliminar item `Si es tool-branch, applicable_as_of está informado`. |
| **§10 (Lo que NO es)** | **Reemplazar completamente**: `Los tutorials paso a paso SÍ son parte del Hub. Son guías técnicas concisas, con un resultado específico y verificable. No son cursos multi-módulo ni reemplazan documentación oficial de herramientas. La extensión del tutorial la define el `estimated_time` declarado por el autor, no un tope fijo de palabras.` |

### 5.4 `context-summary.md`

**Modelo de contenido** (línea 33-41): Reemplazar el diagrama de árbol y la sección entera:

```markdown
### Tipos de artículo
- `concept` — artículo de referencia, cubre un concepto de forma tool-agnostic o tool-specific
- `tutorial` — guía práctica paso a paso con `difficulty` y `estimated_time`. Transversal a las categorías.

### Relaciones
Las relaciones entre artículos usan `article_relations` con tipos `related`, `prerequisite`, `next`.
No existe `parent_id`. Un tutorial puede declarar como `prerequisite` uno o más conceptos.
```

Y en "Tipos de artículo" (línea 46-48):

```markdown
### Tipos de artículo
- `concept` — artículo de referencia enciclopédica (antes incluía `tool-branch`)
- `tutorial` — guía práctica paso a paso (nuevo, reemplaza parcialmente a `tool-branch`)
```

---

## 6. Content Migration of 8 Existing Articles

### 6.1 Plantilla de admin.md por tipo de artículo (post-migración)

Plantilla canónica de `admin.md` para los dos tipos, útil para que el admin (o el agente que genere nuevos artículos) mantenga consistencia editorial. La migración de los 8 artículos existentes se documenta en §4.4.

```yaml
# Para TUTORIAL (los 4 que migran):
metadata:
  slug_uk: claude-code-for-testing
  type: tutorial               # antes: tool-branch
  category: agents             # o tools, prompting, etc. según el tema
  difficulty: intermediate     # NUEVO — requerido para tutorial
  estimated_time: "20 min"     # NUEVO — requerido para tutorial
  # parent: ELIMINADO — usar relations_suggested.prerequisite
  # applicable_as_of: se mantiene si aplica (universal)

# Para CONCEPT (los 4 que migran):
metadata:
  slug_uk: stitch
  type: concept                # antes: tool-branch
  category: tools              # sin cambio
  # difficulty: NO se incluye (es NULL para concepts)
  # estimated_time: NO se incluye (es NULL para concepts)
  # parent: ELIMINADO
```

### 6.2 Validation post-migration

```sql
-- Verificar que los 8 artículos tienen el type correcto
SELECT slug_uk, type, category, difficulty, estimated_time
FROM articles
WHERE slug_uk IN (
  'claude-code-for-testing', 'getting-started-with-claude-design',
  'stitch-infinite-canvas', 'stitch-screen-by-screen',
  'stitch', 'warp-terminal', 'stitch-vs-figma', 'subagents-in-claude-code'
);
-- Resultado esperado: 4 tutorial + 4 concept, todos con category tools (los concept)

-- Verificar que no quedan artículos con type tool-branch
SELECT COUNT(*) = 0 AS no_tool_branch_left FROM articles WHERE type = 'tool-branch';
```

---

## 7. Chained PR Strategy

| PR | Scope | Files | ~LOC | Start | Acceptance Criteria |
|----|-------|-------|------|-------|---------------------|
| **PR 1** | DB + API | `migrations/002_*.sql`, `shared/src/types/article.ts`, `admin/articles.ts`, `public/articles.ts`, `public/tutorials.ts` (new), `public/__tests__/tutorials.test.ts` (new) | ~250 | `main` | Migración ejecutada. API acepta `type: tutorial`. `POST /admin/articles` valida difficulty/estimated_time. `GET /public/tutorials` funciona. `GET /public/tutorials/:slug` funciona. Tests pasan. |
| **PR 2** | Frontend public | `app/(public)/[lang]/tutoriales/**` (new), `components/article/TutorialRenderer.tsx` (new), `components/layout/SidebarLeft.tsx`, `lib/api-client.ts`, `lib/i18n.ts` | ~180 | PR 1 | `/es/tutoriales/{slug}` renderiza tutorial con badges. Sidebar muestra sección Tutoriales. hreflang funciona. `/es/tutoriales` lista tutorials. sitemap incluye URLs de tutorial. |
| **PR 3** | Admin panel + Meilisearch | `app/(admin)/admin/articles/new/page.tsx`, `app/(admin)/admin/articles/[id]/page.tsx`, `app/(admin)/admin/articles/page.tsx`, `lib/admin-api-client.ts`, `services/meilisearch.ts` | ~130 | PR 1 | Admin puede crear/editar tutorial con difficulty y estimated_time. Lista filtra por type concept/tutorial. Meilisearch indexa difficulty como filterable. Búsqueda funciona con nuevo type. |
| **PR 4** | Docs | `docs/hub_prd.md`, `docs/hub_vision.md`, `docs/article-guidelines.md`, `docs/context-summary.md` | ~200 | `main` (indep.) | Los 4 docs reflejan el nuevo modelo de tipos. Guidelines explican estructura canónica de tutorial. §10 de guidelines revierte correctamente. |

**PR 1 verification**: `cd packages/api && npx vitest run` + `psql -f migrations/002_*.sql` + `curl GET /public/tutorials?lang=es`.

**PR 2 verification**: `cd packages/web && npm run dev`, navegar a `/es/tutoriales/`, verificar renderizado. `npm run build` (SSR build sin errores). Sitemap en `/sitemap.xml`.

**PR 3 verification**: Login admin → crear tutorial → verificar campos difficulty/estimated_time → listar y filtrar.

**PR 4 verification**: Review visual de los 4 documentos.

**Rollback**: Cada PR es independiente. `git revert` del merge commit es suficiente. Para PR 1, si se necesita rollback de la migración, ejecutar el down migration SQL incluido en `002_tutorials_type.sql`.

---

## 8. Architecture Decision Records

### ADR-001: Tutorial URL namespace transversal
**Context**: Los tutorials cubren múltiples categorías (Agents, MCP, Patterns, etc.). `/{lang}/{category}/{slug}` obligaría a forzar `category: tools`.
**Decision**: `/es/tutoriales/{slug}` y `/en/tutorials/{slug}`.
**Consequences**: Dos patrones de URL en el sitio. El sitemap y el hreflang deben ramificar por `type`.

### ADR-002: parent_id eliminado, article_relations como única fuente de relaciones
**Context**: `parent_id` era un link implícito `tool-branch → concept`. `article_relations` ya soporta `prerequisite` tipado.
**Decision**: `DROP COLUMN parent_id`. Las relaciones se gestionan exclusivamente vía `article_relations`.
**Consequences**: La sección `tool_branches` en la respuesta JSON de detail desaparece. El frontend debe consultar `relations.prerequisite` para mostrar artículos relacionados. Los 8 artículos migrados pierden su `parent_id`; si existían relaciones padre-hijo previas, deben recrearse como `article_relations`.

### ADR-003: applicable_as_of sin restricción de type
**Context**: El campo era usado exclusivamente por tool-branches pero su semántica ("vigencia de la información tool-specific") aplica a cualquier type.
**Decision**: Mantener el campo disponible para `concept` y `tutorial`.
**Consequences**: Sin cambios en schema. El admin.md de conceptos ahora puede incluir `applicable_as_of`.

### ADR-004: La sección "Implementaciones por herramienta" no existe en el nuevo modelo
**Context**: La estructura canónica previa (`article-guidelines.md` §2.1) listaba "Implementaciones por herramienta" como una sección opcional de los concepts, escrita a mano para listar tool-branches. Con la eliminación de `tool-branch` y la incorporación de `tutorial` con namespace URL transversal, esta sección pierde su razón de ser.
**Decision**: Eliminar la sección del modelo. Los concepts no listan implementaciones de herramientas. El cross-linking entre concept y tutorial usa la sección canónica "Relacionados" (renderizada desde `article_relations` con tipos `related` o `prerequisite`). Ningún tipo de relación se reinterpreta.
**Consequences**: Los concepts existentes que tenían un h2 `## Implementaciones por herramienta` con links hardcodeados a tool-branches deben limpiar su Markdown (quitar el h2 y los links, o reemplazar con referencias vía `article_relations` que el frontend renderiza como "Relacionados"). El autor no escribe esta sección en ningún concept.

---

## 9. Risks and Mitigations

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| **Ventana de inconsistencia DB/API**: migración SQL corre antes que el nuevo código, `parent_id` no existe y el viejo código falla | Alta | PR 1 empaqueta migración + API en un solo deploy atómico. El orden es: (1) correr migración, (2) inmediatamente desplegar API nueva. Sin ventana. |
| **Pérdida de relaciones padre-hijo**: 8 artículos tenían `parent_id` que se elimina sin recrear la relación en `article_relations` | Media | Los 8 artículos son tool-branches cuyas relaciones parent_id ya eran inconsistentes (ver exploration.md §2). Si alguna relación es editorialmente valiosa, se recrea manualmente en el panel admin post-deploy. Documentar en el runbook de deploy. |
| **Meilisearch reindex downtime**: ~2 min sin resultados de búsqueda actualizados | Baja | La reindexación es no-bloqueante. Meilisearch sigue sirviendo resultados con el índice viejo hasta que el nuevo índice se publique. Si se usa `addDocuments`, los documentos existentes se actualizan in-place sin downtime. |
| **URLs de tutorial no indexadas temporalmente**: sitemap nuevo no se regenera hasta el primer request post-deploy | Baja | Next.js con SSR — las URLs son accesibles inmediatamente. Google las descubrirá por navegación interna y hreflang aunque el sitemap tenga unos minutos de delay. |
| **Categoría "tools" con artículos que ya no son tool-branch**: 4 conceptos quedan en `category: tools` | Baja | Es correcto. La categoría `tools` siempre fue para contenido sobre herramientas, no exclusivo de un type. `stitch`, `warp-terminal`, `stitch-vs-figma`, `subagents-in-claude-code` son artículos conceptuales sobre herramientas — pertenecen ahí. |
| **Rollback complejo**: revertir migración SQL requiere restaurar backup o ejecutar down migration | Media | El archivo de migración incluye down migration completa. El backup pre-migración es responsabilidad operativa (documentado en proposal). |

---

## Open Questions

- [ ] **¿Existen relaciones `parent_id` activas que deban migrarse a `article_relations`?** La exploration mostró que algunas son inconsistentes. Respuesta: se pierden en la migración. Si el admin quiere recrearlas, las crea manualmente como `prerequisite` en el panel.
- [ ] **¿Los 4 tutorials migrados tienen `parent_id` que apuntaba a conceptos específicos?** Si es así, esas relaciones se pierden y deben recrearse manualmente. El admin debe verificar post-deploy.
- [ ] **¿El featured de la homepage debe distinguir entre concept y tutorial visualmente?** El proposal no lo menciona. Por ahora, los featured cards no distinguen tipo. Si se quiere, se agrega badge de tipo en un PR futuro.
