# Tasks: add-tutorials-type

Implementación de `tutorial` como nuevo tipo de artículo y eliminación de `tool-branch`. Se introduce `difficulty`, `estimated_time`, nuevo namespace `/tutoriales/` y `article_relations` como única fuente de relaciones entre artículos.

- **Design**: [design.md](./design.md)
- **Specs**: [article-type-system](./specs/article-type-system/spec.md), [article-structure](./specs/article-structure/spec.md), [article-url-routing](./specs/article-url-routing/spec.md)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~580 (suma de 4 PRs) |
| 400-line budget risk | High (por cambio — cada PR individual se mantiene bajo 400) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | ~LOC | Notes |
|------|------|-----------|------|-------|
| 1 | DB migration + API backend | PR 1 | ~260 | Migración + Zod + nuevos endpoints + tests |
| 2 | Frontend público: rutas, renderizado, sidebar | PR 2 | ~180 | Depende de PR 1 (API nueva) |
| 3 | Admin panel + Meilisearch reindex | PR 3 | ~130 | Depende de PR 1 (API nueva) |
| 4 | Docs + migración de 8 admin.md | PR 4 | ~200 | Independiente, aterriza después de PR 3 |

Dependencias: PR 2 y PR 3 dependen de PR 1. PR 4 es independiente pero debe mergearse después de PR 1-3 para consistencia en deploy.

---

## PR 1 — DB Migration + API Backend (~260 LOC)

Verificación: `cd packages/api && npx vitest run && curl http://localhost:3001/api/v1/tutorials?lang=es`

### 1.1 — Migration SQL (UP) ✅
- **Files**: `packages/api/migrations/005_tutorials_type.sql` (crear)
- **Action**: Escribir migración UP con: DROP INDEX `idx_articles_parent`, DROP CHECK constraint actual sobre `type`, ADD CHECK `(type IN ('concept', 'tutorial'))`, ADD COLUMN `difficulty VARCHAR(15)`, ADD COLUMN `estimated_time VARCHAR(50)`, ADD CHECK `difficulty IN ('beginner','intermediate','advanced')`, UPDATE 8 artículos (4→tutorial, 4→concept), DROP COLUMN `parent_id`, CREATE INDEX `idx_articles_difficulty`, CREATE INDEX `idx_articles_type_difficulty`. Todo en un bloque `BEGIN/COMMIT`.
- **Acceptance**: `psql $DATABASE_URL -f packages/api/migrations/005_tutorials_type.sql` ejecuta sin errores. `SELECT slug_uk, type, difficulty FROM articles WHERE slug_uk IN (...)` devuelve los 8 con type correcto. `SELECT COUNT(*) FROM articles WHERE type='tool-branch'` devuelve 0.
- **LOC estimate**: ~70

### 1.2 — Down migration SQL ✅
- **Files**: `packages/api/migrations/005_tutorials_type.sql` (mismo archivo, sección al final)
- **Action**: Agregar bloque de rollback (comentado o como script separado) que revierte: ADD `parent_id`, UPDATE 8 artículos a `tool-branch`, DROP CHECK nuevo, ADD CHECK original, DROP `difficulty` y `estimated_time`, DROP nuevos índices, CREATE `idx_articles_parent`.
- **Acceptance**: Rollback documentado. `git revert` del merge de PR 1 es suficiente; la migración tiene su propio down script.
- **LOC estimate**: ~25

### 1.3 — Actualizar shared types (ArticleType, Article, AdminArticle, AdminArticleListItem) ✅
- **Files**: `packages/shared/src/types/article.ts` (modificar)
- **Action**: Cambiar `ArticleType` a `'concept' | 'tutorial'`. En `Article`: eliminar `tool_branches: ArticleRef[]` y `parent: ArticleRef | null`, agregar `difficulty: string | null`, `estimated_time: string | null`. En `AdminArticle`: eliminar `parent_id: string | null` y `children: ...[]`, agregar `difficulty: string | null`, `estimated_time: string | null`. En `AdminArticleListItem`: eliminar `children_count: number`.
- **Acceptance**: `npx tsc --noEmit` en `packages/shared` compila sin errores. Tipos exportados desde `index.ts` incluyen los nuevos campos.
- **LOC estimate**: ~15

### 1.4 — Zod schemas: admin/articles.ts (CreateArticleSchema, UpdateArticleSchema, ListQuerySchema) ✅
- **Files**: `packages/api/src/routes/admin/articles.ts` (modificar)
- **Action**: 
  - `ListQuerySchema` (línea 20): cambiar `type: z.enum(['concept', 'tool-branch'])` → `z.enum(['concept', 'tutorial'])`.
  - `CreateArticleSchema` (líneas 26-38): cambiar `type` enum, eliminar `parent_id`, agregar `difficulty: z.enum(['beginner','intermediate','advanced']).nullable().optional()`, `estimated_time: z.string().max(50).nullable().optional()`.
  - `UpdateArticleSchema` (líneas 40-46): agregar `difficulty`, `estimated_time` como opcionales.
- **Acceptance**: POST con `type: tool-branch` rechazado con 400. POST con `type: tutorial` + `difficulty` + `estimated_time` pasa validación Zod.
- **LOC estimate**: ~10

### 1.5 — Validation rules: admin POST (difficulty/estimated_time requeridos para tutorial) ✅
- **Files**: `packages/api/src/routes/admin/articles.ts` (modificar, función POST `/`)
- **Action**: Reemplazar validación de `parent_id` (líneas 277-288) con nuevas reglas: si `type='tutorial'` → `difficulty` y `estimated_time` requeridos; si `type='concept'` → `difficulty` y `estimated_time` deben ser null/undefined. Eliminar referencia a `parent_id` en el INSERT (línea 297-300), agregar `difficulty` y `estimated_time` al INSERT.
- **Acceptance**: POST tutorial sin difficulty → 400 "difficulty es requerido". POST concept con difficulty → 400 "concept no pueden tener difficulty". POST tool-branch → 400 Zod.
- **LOC estimate**: ~20

### 1.6 — Admin GET /:id: eliminar children, agregar difficulty/estimated_time ✅
- **Files**: `packages/api/src/routes/admin/articles.ts` (modificar, GET `/:id`)
- **Action**: En el SELECT (línea 319): eliminar `parent_id`, agregar `difficulty`, `estimated_time`. Eliminar subquery de children (líneas 370-382). Eliminar `children: childrenResult.rows` del response JSON (línea 384-392). Eliminar `children_count` subquery del list (líneas 164-168).
- **Acceptance**: GET admin `/articles/:id` no incluye campo `parent_id` ni `children` en la respuesta. Incluye `difficulty` y `estimated_time`. GET admin `/articles` no incluye `children_count` en cada item.
- **LOC estimate**: ~10

### 1.7 — Zod schemas: public/articles.ts (ListQuerySchema) ✅
- **Files**: `packages/api/src/routes/public/articles.ts` (modificar)
- **Action**: 
  - `ListQuerySchema` (línea 14): cambiar `type: z.enum(['concept', 'tool-branch'])` → `z.enum(['concept', 'tutorial'])`. Eliminar `parent_id` del schema.
  - Eliminar condición de filtro `parent_id` (líneas 55-58) y el parámetro correspondiente.
  - Eliminar subquery de `children_count` (líneas 78-82 en SELECT).
- **Acceptance**: Query con `type=tutorial` aceptada. Query con `parent_id=...` rechazada (campo desconocido en Zod).
- **LOC estimate**: ~10

### 1.8 — Public GET /:slug: eliminar tool_branches y parent, agregar difficulty/estimated_time ✅
- **Files**: `packages/api/src/routes/public/articles.ts` (modificar, GET `/:slug`)
- **Action**: 
  - En el SELECT (línea 130-148): eliminar `a.parent_id`, agregar `a.difficulty`, `a.estimated_time`.
  - Eliminar query de `tool_branches` (líneas 157-174).
  - Eliminar query de `parent` (líneas 176-194).
  - En la construcción de `alternate_lang` (líneas 254-262): detectar `a.type === 'tutorial'` → URL `/{lang}/tutoriales/{slug}` (ES) o `/{lang}/tutorials/{slug}` (EN); si es concept, mantener URL actual.
  - En el response JSON (líneas 264-285): eliminar `tool_branches` y `parent`, agregar `difficulty`, `estimated_time`.
- **Acceptance**: GET `/articles/claude-code-for-testing?lang=es` devuelve `difficulty: "intermediate"`, `estimated_time: "20 min"`, sin `tool_branches` ni `parent`. `alternate_lang.url` usa `/en/tutorials/...` si el type es tutorial.
- **LOC estimate**: ~20

### 1.9 — Nuevo endpoint: GET /public/tutorials (listado) + GET /public/tutorials/:slug (detalle) ✅
- **Files**: `packages/api/src/routes/public/tutorials.ts` (crear)
- **Action**: Crear router Express con dos endpoints:
  - `GET /` — listado paginado de tutorials publicados. Query params: `lang`, `difficulty` (opcional), `page`, `per_page`. Filtra por `a.type = 'tutorial'` y `a.status = 'published'`. Devuelve `{ data: [...], pagination: {...} }` con `difficulty` y `estimated_time` en cada item.
  - `GET /:slug` — detalle de tutorial por slug localizado. Misma estructura que GET `/articles/:slug` pero filtra `WHERE a.type = 'tutorial'`. Devuelve `difficulty`, `estimated_time`, `alternate_lang` con URL de tutoriales.
- **Acceptance**: `curl GET /api/v1/tutorials?lang=es` devuelve lista paginada. `curl GET /api/v1/tutorials/claude-code-for-testing?lang=es` devuelve detalle con difficulty/estimated_time. `curl GET /api/v1/tutorials/que-es-mcp?lang=es` devuelve 404 (es un concept, no tutorial).
- **LOC estimate**: ~55

### 1.10 — Registrar ruta tutorials en Express ✅
- **Files**: `packages/api/src/index.ts` (modificar)
- **Action**: Agregar `import tutorialsRouter from './routes/public/tutorials'` y `app.use('/api/v1/tutorials', tutorialsRouter)` en la sección de rutas públicas (después de articles).
- **Acceptance**: Servidor arranca sin errores. `curl http://localhost:3001/api/v1/tutorials?lang=es` responde (no 404 de ruta).
- **LOC estimate**: ~2

### 1.11 — Tests: GET /tutorials y GET /tutorials/:slug ✅
- **Files**: `packages/api/tests/integration/tutorials.test.ts` (crear)
- **Action**: Escribir tests de integración con Vitest + supertest:
  - `GET /api/v1/tutorials?lang=es` — lista paginada de tutorials
  - `GET /api/v1/tutorials?difficulty=beginner` — filtra por difficulty
  - `GET /api/v1/tutorials?difficulty=expert` — 400 invalid
  - `GET /api/v1/tutorials/:slug?lang=es` — detalle con difficulty/estimated_time
  - `GET /api/v1/tutorials/:slug?lang=es` para non-tutorial → 404
  - Verificar `alternate_lang.url` usa namespace `/tutoriales/`
- **Acceptance**: `cd packages/api && npx vitest run` pasa los tests de tutorials.
- **LOC estimate**: ~40

### 1.12 — Tests: admin POST validación de tipo y campos nuevos ✅
- **Files**: `packages/api/tests/integration/tutorials.test.ts` (mismo archivo, agregar describe)
- **Action**: Agregar tests de admin POST:
  - Crear tutorial con difficulty + estimated_time → 201
  - Tutorial sin difficulty → 400
  - Tutorial sin estimated_time → 400
  - Concept con difficulty → 400
  - Concept con estimated_time → 400
  - Rechazar `type: tool-branch` → 400
  - Aceptar `applicable_as_of` para cualquier type
- **Acceptance**: Vitest pasa todos los casos.
- **LOC estimate**: ~30

---

## PR 2 — Frontend Público (~180 LOC)

Verificación: `cd packages/web && npm run build && curl http://localhost:3000/es/tutoriales`

### 2.1 — Página de listado: `/[lang]/tutoriales/page.tsx` ✅
- **Files**: `packages/web/app/(public)/[lang]/tutoriales/page.tsx` (crear)
- **Action**: Server component SSR. Lee query param `difficulty` de `searchParams`. Llama a `getTutorials(lang, { difficulty, page })`. Renderiza grid/list de tutorial cards con badge de difficulty y estimated_time. Incluye Navbar, SidebarLeft (con `currentTutorialDifficulty`), Footer.
- **Acceptance**: `/es/tutoriales` carga con lista de tutorials. `/es/tutoriales?difficulty=intermediate` filtra. `/es/tutoriales?difficulty=expert` muestra error o ningún resultado.
- **LOC estimate**: ~35

### 2.2 — Página de detalle: `/[lang]/tutoriales/[slug]/page.tsx` ✅
- **Files**: `packages/web/app/(public)/[lang]/tutoriales/[slug]/page.tsx` (crear)
- **Action**: Server component SSR. `generateMetadata` con hreflang usando `buildTutorialUrl()`. `default export`: llama `getTutorial()`, renderiza `TutorialRenderer`. Breadcrumb: `~/tutoriales/{slug}`. Sin sección `tool_branches`. Incluye relaciones `prerequisite` y `related` igual que concept page.
- **Acceptance**: `/es/tutoriales/claude-code-for-testing` renderiza tutorial con badges difficulty/time. Metadata incluye `<link rel="alternate" hreflang="en" href="/en/tutorials/..."/>`. `/es/tutoriales/que-es-mcp` → 404.
- **LOC estimate**: ~40

### 2.3 — Componente TutorialRenderer ✅
- **Files**: `packages/web/components/article/TutorialRenderer.tsx` (crear)
- **Action**: Componente cliente que recibe `TutorialRendererProps`: title, summary, difficulty, estimatedTime, applicableAsOf, html, updatedMonth, slug, lang. Renderiza:
  1. Header con badges: `[dificultad]` `[~30 min]` `[v jul 2026]`
  2. Summary
  3. Body HTML procesado (mismo `ArticleRenderer`)
  4. Los h2 de "## Pasos" se parsean opcionalmente para step cards numeradas con verificación
  5. `## Troubleshooting` en `<details><summary>` colapsable
- **Acceptance**: Tutorial con 4 pasos muestra 4 step cards. Tutorial sin estructura canónica renderiza HTML normal. Badges visibles.
- **LOC estimate**: ~45

### 2.4 — API client: getTutorials() y getTutorial() ✅
- **Files**: `packages/web/lib/api-client.ts` (modificar)
- **Action**: Agregar `getTutorials(params: { lang, difficulty?, page?, per_page? }): Promise<TutorialsResponse>` y `getTutorial(slug, lang): Promise<Tutorial>`. Agregar interfaces `TutorialsResponse` y `TutorialListItem`. La función `getArticle` ya maneja `difficulty`/`estimated_time` en la respuesta — no necesita cambios.
- **Acceptance**: `getTutorials({ lang: 'es' })` llama a `/api/v1/tutorials?lang=es`. `getTutorial('mcp', 'es')` llama a `/api/v1/tutorials/mcp?lang=es`. Tipos compilan.
- **LOC estimate**: ~25

### 2.5 — Actualizar SidebarLeft con sección Tutoriales ✅
- **Files**: `packages/web/components/layout/SidebarLeft.tsx` (modificar)
- **Action**: Agregar nuevo prop `currentTutorialDifficulty?: string`. Agregar sección "~/tutoriales" debajo de las 5 categorías (antes de "comunidad"). Renderizar sub-filtro con links: `/{lang}/tutoriales?difficulty=beginner` (Principiante/Beginner), `intermediate`, `advanced`. Labels localizados.
- **Acceptance**: Sidebar muestra sección "Tutoriales" con 3 sub-items. Click en "Intermedio" navega a `/es/tutoriales?difficulty=intermediate`. Ítem activo resaltado cuando `currentTutorialDifficulty` coincide.
- **LOC estimate**: ~15

### 2.6 — buildTutorialUrl() en i18n ✅
- **Files**: `packages/web/lib/i18n.ts` (modificar)
- **Action**: Agregar `buildTutorialUrl(lang: SupportedLang, slug: string): string` que retorna `/${lang}/${lang === 'es' ? 'tutoriales' : 'tutorials'}/${slug}`. Agregar labels de difficulty: `DIFFICULTY_LABELS_ES` y `DIFFICULTY_LABELS_EN`.
- **Acceptance**: `buildTutorialUrl('es', 'mcp')` → `/es/tutoriales/mcp`. `buildTutorialUrl('en', 'mcp')` → `/en/tutorials/mcp`.
- **LOC estimate**: ~10

### 2.7 — Actualizar sitemap para URLs de tutorial ✅
- **Files**: `packages/api/src/routes/public/sitemap.ts` (modificar)
- **Action**: Agregar `a.type` al SELECT (línea 26-36). En `generateUrl` (línea 74): detectar `row.type === 'tutorial'` → construir URL con `/{lang}/tutoriales/{slug}` (ES) o `/{lang}/tutorials/{slug}` (EN). Para concepts, mantener `/{lang}/{category}/{slug}`.
- **Acceptance**: Sitemap XML incluye `<loc>https://aihub.example.com/es/tutoriales/claude-code-for-testing</loc>` con alternates correctos. Las URLs de concept no cambian.
- **LOC estimate**: ~8

### 2.8 — hreflang en página de tutorial ✅
- **Files**: `packages/web/app/(public)/[lang]/tutoriales/[slug]/page.tsx` (ya creado en 2.2, este task es solo la parte hreflang)
- **Action**: En `generateMetadata`: construir `alternates.canonical` con `buildTutorialUrl(lang, slug)`. Construir `alternates.languages` con `buildTutorialUrl(otherLang, altSlug)`. Ver Nota: la metadata está incluida en el task 2.2; este task es el reminder de que debe funcionar.
- **Acceptance**: HTML de `/es/tutoriales/mcp` incluye `<link rel="alternate" hreflang="en" href=".../en/tutorials/..."/>`.
- **LOC estimate**: ~2 (o cero si ya se hizo en 2.2)

---

## PR 3 — Admin Panel + Meilisearch (~130 LOC)

Verificación: Login admin → crear tutorial con difficulty y estimated_time → listar y filtrar. Búsqueda funcional.

### 3.1 — Admin: formulario de nuevo artículo (type selector, campos condicionales) ✅
- **Files**: `packages/web/app/(admin)/admin/articles/new/page.tsx` (modificar)
- **Action**: 
  - Cambiar type selector: `'concept' | 'tool-branch'` → `'concept' | 'tutorial'`. Labels: "Concepto" / "Tutorial".
  - Eliminar state `parent_id`, selector de `parentOptions`.
  - Agregar state `difficulty: ''` y `estimated_time: ''`.
  - Renderizar campos condicionales cuando `form.type === 'tutorial'`: select `difficulty` (Principiante/Intermedio/Avanzado), input `estimated_time` (placeholder: "30 min").
  - `applicable_as_of` sigue visible para cualquier type.
  - `handleSubmit`: enviar `difficulty` y `estimated_time` solo si type=tutorial, eliminar `parent_id` del payload.
- **Acceptance**: Selector muestra "Concepto" y "Tutorial". Seleccionar "Tutorial" → aparecen campos difficulty y estimated_time. Crear tutorial → redirige a admin con artículo creado.
- **LOC estimate**: ~25

### 3.2 — Admin: editar artículo (metadata tab) ✅
- **Files**: `packages/web/app/(admin)/admin/articles/[id]/page.tsx` (modificar)
- **Action**: En la tab "Metadata":
  - Eliminar campo `parent_id` de la UI.
  - Agregar campos `difficulty` (select) y `estimated_time` (input) — siempre visibles, editables.
  - `applicable_as_of` sigue presente.
  - Cargar `difficulty` y `estimated_time` desde los datos del artículo (ya están en `ArticleData`).
  - `handleMetadataSave`: enviar `difficulty` y `estimated_time` en el PUT.
- **Acceptance**: Editor carga tutorial existente con difficulty y estimated_time pre-llenados. Guardar cambios persiste en DB.
- **LOC estimate**: ~20

### 3.3 — Admin: lista de artículos (filtro de type, columna difficulty) ✅
- **Files**: `packages/web/app/(admin)/admin/articles/page.tsx` (modificar)
- **Action**: 
  - Filtro de tipo: cambiar opciones a `concept` / `tutorial` (label: "Concepto" / "Tutorial").
  - Badge de tipo: `[concepto]` / `[tutorial]` en vez de `[concepto]` / `[herramienta]`.
  - Agregar columna "Dificultad" en la tabla (visible en desktop, oculta en mobile).
  - Eliminar columna `children_count` de la interfaz `ArticleItem`.
- **Acceptance**: Lista filtra correctamente por `type=tutorial`. Columna difficulty muestra "Intermedio" para tutorials, vacía para concepts. Badge de tipo correcto.
- **LOC estimate**: ~15

### 3.4 — Admin API client: actualizar createArticle, updateArticle ✅
- **Files**: `packages/web/lib/admin-api-client.ts` (modificar)
- **Action**: 
  - `createArticle`: eliminar `parent_id` del tipo de `data`, agregar `difficulty?: string | null`, `estimated_time?: string | null`.
  - `updateArticle`: agregar `difficulty?: string`, `estimated_time?: string` a los params.
- **Acceptance**: TypeScript compila. Llamadas `createArticle({ type: 'tutorial', difficulty: 'beginner', ... })` aceptadas.
- **LOC estimate**: ~8

### 3.5 — Meilisearch: agregar difficulty como filterable ✅
- **Files**: `packages/api/src/services/meilisearch.ts` (modificar)
- **Action**: En `setupMeilisearchIndex()` (línea 39-44): agregar `'difficulty'` al array `filterableAttributes`. En la interfaz `MeilisearchDocument` (líneas 19-32): agregar `difficulty?: string`. En `upsertDocument` en `admin/articles.ts` (línea 511-526): agregar `difficulty: article.difficulty` al documento que se indexa.
- **Acceptance**: `setupMeilisearchIndex()` configura `difficulty` como filterable. Documentos en Meilisearch incluyen `difficulty`. Búsqueda filtra por difficulty.
- **LOC estimate**: ~8

### 3.6 — Reindex manual post-migración ✅
- **Files**: `packages/api/src/services/meilisearch.ts` (modificar opcional) o documentar runbook
- **Action**: Agregar función `reindexAllArticles()` que recorre todos los artículos publicados y llama `upsertDocument()` con los nuevos campos. Alternativa: documentar que tras el deploy de PR 3, el admin debe reimportar contenido de los 8 artículos para disparar `upsertDocument`. La estrategia más simple: ejecutar un script one-shot o documentar que `POST /admin/articles/:id/content` reindexa automáticamente.
- **Acceptance**: Tras deploy de PR 3, búsqueda en Meilisearch incluye `type: tutorial` y `difficulty` en los resultados.
- **LOC estimate**: ~15

---

## PR 4 — Docs + Migración de Contenido (~200 LOC)

Verificación: Review visual de los 4 docs + `grep -l "type: tool-branch" articles/*/admin.md` devuelve vacío.

### 4.1 — Actualizar article-guidelines.md ✅
- **Files**: `docs/article-guidelines.md` (modificar)
- **Action**: 
  - §1: eliminar §1.2 (tool-branch). Agregar §1.2 Tutorial: definición, `difficulty`, `estimated_time`.
  - §2: eliminar §2.2 (Rama tool-specific). Agregar §2.2 Estructura canónica de tutorial (Objetivo, Prerrequisitos, Pasos, Resultado esperado, Troubleshooting, Siguiente paso).
  - §3: Metadatos — `type` → `concept | tutorial`. Eliminar `parent_id`. Agregar `difficulty` y `estimated_time`. `applicable_as_of` → opcional para cualquier type.
  - §4: Nota: "Los tutorials no tienen categoría propia".
  - §8: Ejemplo YAML con `type: tutorial`, `difficulty: intermediate`, `estimated_time: "30 min"`.
  - §9: Checklist: agregar items de tutorial, eliminar items de tool-branch.
  - §10: Reemplazar completamente — "Los tutorials paso a paso SÍ son parte del Hub".
- **Acceptance**: Documento refleja el nuevo modelo. No menciona `tool-branch` excepto en contexto histórico.
- **LOC estimate**: ~60

### 4.2 — Actualizar hub_prd.md ✅
- **Files**: `docs/hub_prd.md` (modificar)
- **Action**: 
  - §2: "soporte de estructura en árbol" → "soporte de artículos tipo concepto y tutorial con relaciones tipadas".
  - §6.1: agregar tabla de estructura canónica de tutorial. Eliminar tabla "rama tool-specific".
  - §6.2: reemplazar con descripción de `article_relations`.
  - §6.5: nota: "La sección Tutoriales no es una categoría — es un namespace transversal".
  - §6.10: agregar URLs de tutorial.
  - §7: actualizar modelo de datos (Article.type, sin parent_id, difficulty, estimated_time).
- **Acceptance**: PRD refleja el nuevo modelo. URLs de tutorial documentadas. Modelo de datos actualizado.
- **LOC estimate**: ~45

### 4.3 — Actualizar hub_vision.md ✅
- **Files**: `docs/hub_vision.md` (modificar)
- **Action**: 
  - §5.1: reemplazar diagrama de árbol con descripción de relaciones.
  - §5.3: reemplazar "Anatomía rama tool-specific" con "Anatomía de un tutorial" (6 secciones canónicas).
  - §5.4: agregar entrada "Tutoriales" como sección transversal.
- **Acceptance**: Visión refleja el nuevo modelo. Sin referencias a tool-branch.
- **LOC estimate**: ~30

### 4.4 — Actualizar context-summary.md ✅
- **Files**: `docs/context-summary.md` (modificar)
- **Action**: 
  - "Modelo de contenido": reemplazar con descripción de `concept | tutorial` + `article_relations`.
  - "Tipos de artículo": actualizar definiciones.
- **Acceptance**: Context summary refleja el estado actual del sistema.
- **LOC estimate**: ~15

### 4.5 — Actualizar admin.md: claude-code-for-testing ✅
- **Files**: `articles/claude-code-for-testing/admin.md` (modificar)
- **Action**: Cambiar `type: tool-branch` → `type: tutorial`. Agregar `difficulty: intermediate`, `estimated_time: "20 min"`. Eliminar línea `parent: ai-coding-agents`. Mantener `applicable_as_of`, `relations_suggested`, `resources_suggested`.
- **Acceptance**: `grep "type:" articles/claude-code-for-testing/admin.md` muestra `tutorial`. Sin línea `parent:`.
- **LOC estimate**: ~4

### 4.6 — Actualizar admin.md: getting-started-with-claude-design ✅
- **Files**: `articles/getting-started-with-claude-design/admin.md` (modificar)
- **Action**: `type: tutorial`, `difficulty: intermediate`, `estimated_time: "25 min"`. Eliminar `parent:`.
- **Acceptance**: Sin `tool-branch`, sin `parent:`.
- **LOC estimate**: ~4

### 4.7 — Actualizar admin.md: stitch-infinite-canvas ✅
- **Files**: `articles/stitch-infinite-canvas/admin.md` (modificar)
- **Action**: `type: tutorial`, `difficulty: intermediate`, `estimated_time: "20 min"`. Eliminar `parent:`.
- **Acceptance**: Sin `tool-branch`, sin `parent:`.
- **LOC estimate**: ~4

### 4.8 — Actualizar admin.md: stitch-screen-by-screen ✅
- **Files**: `articles/stitch-screen-by-screen/admin.md` (modificar)
- **Action**: `type: tutorial`, `difficulty: intermediate`, `estimated_time: "20 min"`. Eliminar `parent:`.
- **Acceptance**: Sin `tool-branch`, sin `parent:`.
- **LOC estimate**: ~4

### 4.9 — Actualizar admin.md: stitch ✅
- **Files**: `articles/stitch/admin.md` (modificar)
- **Action**: `type: concept`, SELF (mantener `category: tools`). SIN agregar `difficulty` ni `estimated_time`. Eliminar `parent:` si existe. Mantener `applicable_as_of`, `relations_suggested`.
- **Acceptance**: `type: concept`. Sin `difficulty`, sin `estimated_time`, sin `parent:`.
- **LOC estimate**: ~3

### 4.10 — Actualizar admin.md: warp-terminal ✅
- **Files**: `articles/warp-terminal/admin.md` (modificar)
- **Action**: `type: concept`, `category: tools`. Eliminar `parent:` si existe.
- **Acceptance**: `type: concept`. Sin `difficulty`, sin `estimated_time`, sin `parent:`.
- **LOC estimate**: ~3

### 4.11 — Actualizar admin.md: stitch-vs-figma ✅
- **Files**: `articles/stitch-vs-figma/admin.md` (modificar)
- **Action**: `type: concept`, `category: tools`. Eliminar `parent:`.
- **Acceptance**: `type: concept`. Sin `parent:`.
- **LOC estimate**: ~3

### 4.12 — Actualizar admin.md: subagents-in-claude-code ✅
- **Files**: `articles/subagents-in-claude-code/admin.md` (modificar)
- **Action**: `type: concept`, `category: tools`. Eliminar `parent:`.
- **Acceptance**: `type: concept`. Sin `parent:`.
- **LOC estimate**: ~3

---

## Dependencias entre PRs

```
PR 1 (DB + API)
 ├── PR 2 (Frontend público) — necesita GET /tutorials y GET /tutorials/:slug
 ├── PR 3 (Admin + Meilisearch) — necesita POST/PUT con nuevos campos
 └── PR 4 (Docs + admin.md) — independiente, mergear después de PR 3
```

PR 2 y PR 3 dependen de PR 1. PR 4 es independiente, pero debe mergearse **después** de PR 1-3 para consistencia en deploy. El orden de merge sugerido: PR 1 → PR 2 → PR 3 → PR 4.

## Verificación por PR

### PR 1
```bash
cd packages/api && npx vitest run
psql $DATABASE_URL -f packages/api/migrations/005_tutorials_type.sql
curl http://localhost:3001/api/v1/tutorials?lang=es
# ↑ debe devolver lista de tutorials (si hay datos) o array vacío
```

### PR 2
```bash
cd packages/web && npm run build
# Debe compilar sin errores. Luego en dev:
curl http://localhost:3000/es/tutoriales
# Debe devolver HTML de la página de listado
```

### PR 3
- Login admin → New Article → type: Tutorial → difficulty: "Intermedio" → estimated_time: "30 min" → crear
- Ver que aparece en la lista con badge `[tutorial]` y columna "Intermedio"
- Editar → Metadata tab → ver difficulty y estimated_time → cambiar → guardar

### PR 4
```bash
grep -l "type: tool-branch" articles/*/admin.md
# Debe devolver vacío
grep -l "^  parent:" articles/*/admin.md
# Debe devolver vacío
```
- Revisión visual de los 4 docs

## Rollback

Cada PR es independiente. `git revert` del merge commit es suficiente:

- **PR 1**: Si se necesita rollback de la migración, ejecutar el down migration incluido en `005_tutorials_type.sql`. Luego revertir el merge.
- **PR 2**: Revertir merge. Las rutas `/tutoriales` dejan de funcionar.
- **PR 3**: Revertir merge. Admin vuelve a `tool-branch`.
- **PR 4**: Revertir merge. Docs y admin.md vuelven a versión anterior.

---

## 400-line Budget Guards

### PR 1

Chained PRs recommended: Yes
400-line budget risk: Medium

### PR 2

Chained PRs recommended: Yes
400-line budget risk: Low

### PR 3

Chained PRs recommended: Yes
400-line budget risk: Low

### PR 4

Chained PRs recommended: Yes
400-line budget risk: Low
