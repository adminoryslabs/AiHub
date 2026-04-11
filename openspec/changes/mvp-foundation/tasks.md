# Tasks — MVP Foundation

> Checklist de implementación para el cambio `mvp-foundation`
> Creado: 2026-04-06
> Estado: draft

## Leyenda
- [ ] Pendiente
- [x] Completado
- ⚠️ Bloqueante / requiere decisión
- 🔄 En progreso

## Fase 0: Preparación
- [x] Verificar stack (Node.js 18+, pnpm/npm, TypeScript)
- [x] Inicializar monorepo con Turborepo
- [x] Configurar gitignores y linting (ESLint + Prettier)

## Fase 1: Fundación compartida

### 1.1 Base de datos
- [ ] Crear proyecto en NeonDB
- [x] Ejecutar migración inicial (SQL completo del design.md)
- [x] Crear todos los índices definidos
- [x] Verificar trigger updated_at funcionando
- [x] Seed: insertar 5 categorías iniciales
- [x] Seed: crear usuario admin inicial con bcrypt

### 1.2 Backend Express
- [x] Inicializar proyecto packages/api (TypeScript)
- [x] Instalar dependencias: express, pg, jwt, bcrypt, @aws-sdk/client-s3, meilisearch, dotenv, cors
- [x] Crear estructura de rutas:
  - [x] `src/routes/public/` (health, articles, categories, featured, search, sitemap)
  - [x] `src/routes/admin/` (auth, articles, resources, images)
- [x] Implementar middleware de autenticación (`authenticateAdmin`)
- [x] Implementar middleware de manejo de errores centralizado
- [x] Implementar logging básico (winston/pino)
- [x] Conectar pool de PostgreSQL (node-pg o pg directo)
- [x] Implementar Meilisearch client y configuración del índice
- [x] Implementar Cloudflare R2 client (S3 compatible)
- [x] Implementar todos los endpoints públicos (6):
  - [x] `GET /api/v1/health`
  - [x] `GET /api/v1/articles` (con filtros, paginación)
  - [x] `GET /api/v1/articles/:slug` (con relaciones completas)
  - [x] `GET /api/v1/categories` (con article_count)
  - [x] `GET /api/v1/featured`
  - [x] `GET /api/v1/search` (delegar a Meilisearch)
  - [x] `GET /api/v1/sitemap` (XML response)
- [x] Implementar todos los endpoints admin (13):
  - [x] `POST /api/v1/admin/auth/login`
  - [x] `GET /api/v1/admin/articles` (filtros)
  - [x] `POST /api/v1/admin/articles`
  - [x] `PUT /api/v1/admin/articles/:id`
  - [x] `POST /api/v1/admin/articles/:id/content`
  - [x] `PUT /api/v1/admin/articles/:id/status`
  - [x] `POST /api/v1/admin/articles/:id/verify`
  - [x] `GET /api/v1/admin/articles/:id` (detalle completo)
  - [x] CRUD recursos: `POST/PUT/DELETE /api/v1/admin/resources`
  - [x] `POST /api/v1/admin/articles/:id/resources`
  - [x] `DELETE /api/v1/admin/articles/:id/resources/:resource_id`
  - [x] `POST /api/v1/admin/articles/:id/relations`
  - [x] `DELETE /api/v1/admin/articles/:id/relations/:to_id`
  - [x] `POST /api/v1/admin/images/upload`
- [x] Sincronización Meilisearch:
  - [x] addDocument/updateDocument al crear/actualizar contenido
  - [x] deleteDocument al eliminar artículo
  - [x] Filtrar siempre por status = published en búsqueda pública
- [x] Validaciones de entrada (Joi/zod) en todos los endpoints

### 1.4 Testing del backend (Vitest + supertest)
- [x] Instalar dependencias de testing: vitest, @vitest/coverage-v8, supertest, @types/supertest
- [x] Configurar `vitest.config.ts` en `packages/api` (environment node, coverage)
- [x] Agregar scripts en package.json: `test`, `test:watch`, `test:coverage`
- [x] Tests unitarios — middleware:
  - [x] `authenticateAdmin`: sin header → 401, token inválido → 401, token válido → next()
  - [x] `errorHandler`: errores conocidos → status correcto, errores desconocidos → 500
- [x] Tests unitarios — servicios:
  - [ ] `articles.service`: lógica de construcción de queries y mapeo de respuestas
  - [x] `meilisearch.service`: documentos generados correctamente antes de indexar
- [x] Tests de integración (supertest, DB de test):
  - [x] `GET /api/v1/health` → 200 con estructura correcta
  - [x] `GET /api/v1/categories?lang=es` → lista con article_count
  - [x] `GET /api/v1/articles?lang=es` → solo publicados, paginación correcta
  - [x] `GET /api/v1/articles/:slug?lang=es` → 200 si publicado, 404 si no existe
  - [x] `GET /api/v1/featured?lang=es` → solo featured + published
  - [x] `POST /api/v1/admin/auth/login` → 200 con token, 401 con credenciales inválidas
  - [x] `POST /api/v1/admin/articles` sin token → 401
  - [x] `POST /api/v1/admin/articles` con token → 201 artículo creado
  - [x] `POST /api/v1/admin/articles/:id/content` → upsert correcto
  - [x] `PUT /api/v1/admin/articles/:id/status` → transiciones válidas e inválidas

### 1.3 Tipos compartidos
- [x] Crear `packages/shared` con tipos TypeScript
- [x] Definir tipos: Article, ArticleContent, Category, Resource, ArticleRelation, AdminUser
- [x] Publicar como paquete local para consumir en api y web

---

## Fase 2: Sistema de diseño (UI)

### 2.1 Configuración de Tailwind
- [x] Inicializar proyecto packages/web (Next.js 15+ App Router)
- [x] Instalar dependencias: next, react, react-dom, tailwindcss, postcss, autoprefixer
- [x] Configurar `tailwind.config.ts` con tokens del design.md:
  - [x] Colores (primary, surface, on-surface, etc.)
  - [x] borderRadius (DEFAULT, lg, xl, full)
  - [x] fontFamily (headline: Manrope, body: Inter, mono: JetBrains Mono)
- [x] Instalar fuentes from Google Fonts:
  - [x] Manrope (weights: 400,600,700,800)
  - [x] Inter (weights: 300,400,500,600)
  - [x] JetBrains Mono (weight: 400)
  - [x] Material Symbols Outlined
- [x] Instalar plugins de Tailwind:
  - [x] `@tailwindcss/typography`
  - [x] `@tailwindcss/forms`
  - [x] `@tailwindcss/container-queries`
- [x] Crear `app/globals.css` con variables CSS para dark mode
- [x] Configurar next.config.js para optimizar fuentes

### 2.2 Componentes base
- [x] Button (variantes: primary, secondary, ghost, icon)
- [x] Badge (variantes: status, category, type)
- [ ] Card (con bordes y sombras del design)
- [ ] Input, Textarea (con focus states)
- [x] Icon component (wrapper de Material Symbols)
- [x] Layout components:
  - [x] Navbar (fixed, glass effect, con logo, search, lang/topic/avatar)
  - [x] SidebarLeft (categorías colapsables, iconos Material)
  - [x] SidebarRight (TOC, recursos, CTA) — solo en artículo
  - [x] Footer
- [x] ThemeToggle (dark/light, localStorage)
- [x] LanguageSwitcher (ES/EN pills)
- [x] SearchBar (overlay con resultados, debounce, keyboard nav)
- [x] ArticleRenderer:
  - [x] remark-parse, remark-gfm, remark-rehype
  - [x] rehype-highlight (syntax highlighting)
  - [x] rehype-raw, rehype-sanitize
  - [x] Plugin custom para Mermaid (detectar ```mermaid)
  - [x] Clases CSS para imágenes (img-contained, img-full)
- [ ] MermaidRenderer (client-side con mermaid.js)
- [ ] CodeBlock (con filename, copy button, syntax highlighting)

---

## Fase 3: Sitio público (Next.js)

### 3.1 Páginas SSR
- [x] `/` → redirect por Accept-Language (con fallback a /es)
- [x] `/[lang]` → homepage con categorías (cards) + featured (lista)
- [x] `/[lang]/[category]` → listado de artículos de categoría
- [x] `/[lang]/[category]/[slug]` → artículo completo
- [x] 404 page (con link al home)

### 3.2 Data fetching y API client
- [x] Crear `lib/api-client.ts` (fetch wrapper con base URL, headers auto)
- [x] Implementar carga de datos en server components (async/await)
- [x] Mapeo de respuestas API a tipos del shared package
- [x] Manejo de errores HTTP (404, 500, etc.)

### 3.3 i18n routing
- [x] `lib/i18n.ts` con:
  - [x] Mapa de íconos `CATEGORY_ICONS` (slug → Material Symbol, decisión de UI)
  - [x] Funciones `getCategorySlug(categories, slug, lang)` y `resolveCategory(categories, localizedSlug)` — operan sobre datos de la API, no un diccionario estático
  - [x] Lista de idiomas soportados
- [x] Cargar categorías desde `GET /api/v1/categories` (ambos idiomas) en server components para construir el mapa de URLs en runtime
- [x] Generar URLs correctas en links (usar slugs localizados resueltos desde la API)
- [x] LanguageSwitcher funcional (cambia URL manteniendo categoría/slug)
- [x] Mantener idioma en query params cuando sea necesario

### 3.4 SEO
- [x] `generateMetadata` en cada página con:
  - [x] title: `{title} — AI Hub` o default
  - [x] description: resumen del artículo o default
  - [x] canonical URL
  - [x] hreflang links (alternates ES/EN)
  - [x] og:title, og:description, og:type, og:url
- [x] Sitemap XML endpoint (`/api/v1/sitemap`) — ya en backend, frontend solo consume
- [ ] robots.txt (estático o dinámico)

### 3.5 Layout y experiencia
- [x] Sidebar izquierdo con categorías colapsables (obtenidas de API)
- [x] En artículo: sidebar derecha con TOC (scroll-spy) + recursos
- [x] Responsive:
  - [x] Desktop: 3 column layout
  - [x] Tablet: sidebars visibles pero ajustadas
  - [x] Móvil: bottom navigation bar (4 items), hamburger menu
- [ ] Scroll spy para TOC (highlight sección actual)
- [ ] Scroll suave a anchors internos (#heading)

### 3.6 Búsqueda
- [x] SearchBar en Navbar
- [x] Overlay/modal con resultados
- [x] Debounce 300ms → `GET /api/v1/search`
- [x] Mostrar: título, snippet (highlighted), categoría, badge idioma
- [x] Navegación por teclado (↑↓ Enter Escape)
- [x] Click → navegar a artículo

---

## Fase 4: Panel de admin (Next.js)

### 4.1 Autenticación frontend
- [x] `/admin/login` con email/password (form + validación)
- [x] `lib/auth.ts`: guardar/leer/eliminar token en localStorage
- [x] Middleware de Next.js para proteger `/admin/*` (excepto login)
- [x] Logout (eliminar token + redirect)
- [x] Redirección automática a login si no autenticado

### 4.2 Páginas del panel
- [x] `/admin` — Dashboard:
  - [x] Stats: total, published, draft, deprecated
  - [x] Últimos 10 artículos modificados
  - [x] Indicador de artículos pendientes de verificación (>30 días)
- [x] `/admin/articles` — Lista con:
  - [x] Tabla con columnas: título, categoría, tipo, estado, badges ES/EN, última edición, acciones
  - [x] Filtros: estado, categoría, tipo, búsqueda
  - [x] Paginación
  - [x] Botón "Nuevo artículo"
- [x] `/admin/articles/new` — Crear metadatos:
  - [x] Form con campos: slug_uk, type, parent_id (solo tool-branch), category (dropdown dinámico), volatility, domains, featured
  - [x] Validaciones (slug único, category válida, parent válido)
  - [x] Tras crear → redirect a editor
- [x] `/admin/articles/[id]` — Editor con pestañas:
  - [x] **Metadatos**: editar category, volatility, featured, domains, applicable_as_of
  - [x] **Contenido ES**: drag & drop .md, textarea, preview (título+resumen), botón Importar → `POST /api/v1/admin/articles/:id/content`
  - [x] **Contenido EN**: igual que ES
  - [x] **Relaciones**: agregar/eliminar related, prerequisite, next (con selector de artículos)
  - [x] **Recursos**: listar vinculados, agregar (crear nuevo o vincular existente), desvincular
  - [x] Indicadores de completitud por idioma (✅/⚠️/🕐)
  - [x] Botones de verificación por idioma → `POST /api/v1/admin/articles/:id/verify`
- [x] `/admin/resources` — CRUD de recursos (tabla + formulario modal)
- [ ] `/admin/images` — Upload a R2:
  - [ ] Drag & drop múltiple
  - [ ] Validación: tipo (png,jpg,webp,svg), tamaño (max 5MB)
  - [ ] Tras subir: mostrar URL pública + botón copiar
  - [ ] Historial de subidas recientes

### 4.3 UX admin
- [x] Badges de estado con colores: draft (gris), published (verde), deprecated (rojo)
- [x] Confirmaciones antes de publicar/deprecar
- [x] Feedback visual (toast/snackbar) en success/error
- [x] Loading states en botones
- [x] Indicador "desactualizado" si `last_verified_at` es null o >30 días

---

## Fase 5: Integraciones y despliegue

### 5.1 Variables de entorno
- [x] Crear `.env.example` para API (todos los campos del design.md)
- [x] Crear `.env.example` para Web
- [ ] Documentar obtención de claves (Neon, Meilisearch, R2) en README

### 5.2 Docker Compose (dev)
- [x] servicios: meilisearch (postgres reutiliza contenedor existente `fcp_db`)
- [x] volúmenes persistentes para datos
- [x] puertos expuestos (7700)
- [x] Variables de entorno para los servicios
- [ ] Documentar cómo levantar entorno

### 5.3 Scripts de migración y seed
- [x] Empaquetar SQL de schema en `packages/api/migrations/001_initial_schema.sql`
- [x] Empaquetar seed de categorías en `002_seed_categories.sql`
- [x] Script seed de admin user (bcrypt hash) en `seeds/create-admin.ts`
- [ ] Documentar cómo ejecutar migraciones (orden, comandos)
- [ ] Script de sincronización inicial de Meilisearch (bulk index de publicados)

### 5.4 Deploy
- [ ] Frontend: conectar repo a Vercel, configurar build command
- [ ] Backend: deploy a Fly.io (escalar a 256MB)
- [ ] Configurar variables de entorno en Vercel y Fly.io
- [ ] Ejecutar migraciones en NeonDB tras deploy
- [ ] Probar health check endpoint en producción

---

## Fase 6: Testing y validación

- [ ] Verificar que todas las páginas públicas son SSR (no client-only)
- [ ] Probar bilingüismo: crear artículos ES+EN, ver URLs correctas
- [ ] Probar búsqueda en Meilisearch (sinónimos si se configuran)
- [ ] Probar upload de imágenes a R2 (URLs públicas correctas)
- [ ] Probar ciclo completo: crear artículo → importar markdown → publicar → ver en público
- [ ] Probar dark mode (persistencia en localStorage)
- [ ] Probar responsive (mobile/tablet/desktop)
- [ ] Validar SEO: meta tags, hreflang, sitemap
- [ ] Probar middleware de autenticación (rutas protegidas)
- [ ] Probar flujo de verificación (last_verified_at)
- [ ] Probar relaciones entre artículos (related, prerequisite, next)

---

## Fase 7: Documentation

- [ ] README.md del proyecto raíz:
  - [ ] Estructura del monorepo
  - [ ] Cómo correr en desarrollo (docker-compose, env vars)
  - [ ] Cómo desplegar (Vercel, Fly.io, Neon)
  - [ ] Variables de entorno requeridas
- [ ] README.md en `packages/api`:
  - [ ] API endpoints (públicos y admin)
  - [ ] Variables de entorno
  - [ ] Cómo ejecutar migraciones
  - [ ] Cómo seedear datos
- [ ] README.md en `packages/web`:
  - [ ] Rutas disponibles
  - [ ] Componentes principales
  - [ ] Cómo configurar Tailwind
  - [ ] Cómo extender el sistema de diseño
- [ ] docs/architecture.md (ya existe, solo enlazar)
- [ ] CHANGELOG.md (o usar git history)

---

## Checklist final de MVP

- [ ] Schema DB completo implementado en NeonDB
- [ ] 20 endpoints API funcionando (7 públicos + 13 admin)
- [ ] Autenticación JWT para admin (bcrypt, middleware)
- [ ] Meilisearch sincronizando artículos (push-based)
- [ ] Cloudflare R2 subiendo imágenes (S3 API)
- [ ] Frontend público:
  - [ ] Homepage con categorías + featured
  - [ ] Listado por categoría
  - [ ] Artículo completo (SSR)
  - [ ] Búsqueda overlay
- [ ] Panel admin:
  - [ ] Login
  - [ ] Dashboard
  - [ ] Lista de artículos con filtros
  - [ ] Crear/editar artículo (metadatos + contenido ES/EN)
  - [ ] Gestión de relaciones y recursos
  - [ ] Upload de imágenes
- [ ] Bilingüe (ES/EN) funcionando en todo el flujo
- [ ] SSR confirmado en todas las rutas públicas
- [ ] SEO: meta tags, hreflang, sitemap
- [ ] Dark mode con persistencia
- [ ] Responsive (mobile bottom nav, sidebars)
- [ ] Desplegado en Vercel (frontend) y Fly.io (backend)
- [ ] Variables de entorno documentadas
- [ ] Migraciones y seed documentados y probados

---

## Notas
- Este checklist es la guía de implementación del MVP Foundation.
- Las tareas se pueden ejecutar en paralelo cuando no haya dependencias.
- Cualquier desviación del `design.md` debe ser discutida antes de implementar.
- El código debe seguir las reglas del proyecto (CLAUDE.md): comentarios en español, variables en inglés, SEO obligatorio, nada de client-only para contenido público.
- Toda la lógica de negocio vive en el backend (Express). El frontend es presentación pura.
- Las migraciones deben ser idempotentes (usar `ON CONFLICT DO NOTHING` donde aplique).
