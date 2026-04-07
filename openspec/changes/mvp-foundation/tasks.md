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
- [ ] Verificar stack (Node.js 18+, pnpm/npm, TypeScript)
- [ ] Inicializar monorepo con Turborepo
- [ ] Configurar gitignores y linting (ESLint + Prettier)

## Fase 1: Fundación compartida

### 1.1 Base de datos
- [ ] Crear proyecto en NeonDB
- [ ] Ejecutar migración inicial (SQL completo del design.md)
- [ ] Crear todos los índices definidos
- [ ] Verificar trigger updated_at funcionando
- [ ] Seed: insertar 5 categorías iniciales
- [ ] Seed: crear usuario admin inicial con bcrypt

### 1.2 Backend Express
- [ ] Inicializar proyecto packages/api (TypeScript)
- [ ] Instalar dependencias: express, pg, jwt, bcrypt, @aws-sdk/client-s3, meilisearch, dotenv, cors
- [ ] Crear estructura de rutas:
  - [ ] `src/routes/public/` (health, articles, categories, featured, search, sitemap)
  - [ ] `src/routes/admin/` (auth, articles, resources, images)
- [ ] Implementar middleware de autenticación (`authenticateAdmin`)
- [ ] Implementar middleware de manejo de errores centralizado
- [ ] Implementar logging básico (winston/pino)
- [ ] Conectar pool de PostgreSQL (node-pg o直接 pg)
- [ ] Implementar Meilisearch client y configuración del índice
- [ ] Implementar Cloudflare R2 client (S3 compatible)
- [ ] Implementar todos los endpoints públicos (6):
  - [ ] `GET /api/v1/health`
  - [ ] `GET /api/v1/articles` (con filtros, paginación)
  - [ ] `GET /api/v1/articles/:slug` (con relaciones completas)
  - [ ] `GET /api/v1/categories` (con article_count)
  - [ ] `GET /api/v1/featured`
  - [ ] `GET /api/v1/search` (delegar a Meilisearch)
  - [ ] `GET /api/v1/sitemap` (XML response)
- [ ] Implementar todos los endpoints admin (11):
  - [ ] `POST /api/v1/admin/auth/login`
  - [ ] `GET /api/v1/admin/articles` (filtros)
  - [ ] `POST /api/v1/admin/articles`
  - [ ] `PUT /api/v1/admin/articles/:id`
  - [ ] `POST /api/v1/admin/articles/:id/content`
  - [ ] `PUT /api/v1/admin/articles/:id/status`
  - [ ] `POST /api/v1/admin/articles/:id/verify`
  - [ ] `GET /api/v1/admin/articles/:id` (detalle completo)
  - [ ] CRUD recursos: `POST/PUT/DELETE /api/v1/admin/resources`
  - [ ] `POST /api/v1/admin/articles/:id/resources`
  - [ ] `DELETE /api/v1/admin/articles/:id/resources/:resource_id`
  - [ ] `POST /api/v1/admin/articles/:id/relations`
  - [ ] `DELETE /api/v1/admin/articles/:id/relations/:to_id`
  - [ ] `POST /api/v1/admin/images/upload`
- [ ] Sincronización Meilisearch:
  - [ ] addDocument/updateDocument al crear/actualizar contenido
  - [ ] deleteDocument al eliminar artículo
  - [ ] Filtrar siempre por status = published en búsqueda pública
- [ ] Validaciones de entrada (Joi/zod) en todos los endpoints
- [ ] Tests de integración para health check
- [ ] Tests de integración para endpoints públicos
- [ ] Tests de integración para autenticación admin
- [ ] Tests de integración para CRUD de artículos
- [ ] Tests de integración para upload de imágenes

### 1.3 Tipos compartidos
- [ ] Crear `packages/shared` con tipos TypeScript
- [ ] Definir tipos: Article, ArticleContent, Category, Resource, ArticleRelation, AdminUser
- [ ] Publicar como paquete local para consumir en api y web

---

## Fase 2: Sistema de diseño (UI)

### 2.1 Configuración de Tailwind
- [ ] Inicializar proyecto packages/web (Next.js 15+ App Router)
- [ ] Instalar dependencias: next, react, react-dom, tailwindcss, postcss, autoprefixer
- [ ] Configurar `tailwind.config.ts` con tokens del design.md:
  - [ ] Colores (primary, surface, on-surface, etc.)
  - [ ] borderRadius (DEFAULT, lg, xl, full)
  - [ ] fontFamily (headline: Manrope, body: Inter, mono: JetBrains Mono)
- [ ] Instalar fuentes from Google Fonts:
  - [ ] Manrope (weights: 400,600,700,800)
  - [ ] Inter (weights: 300,400,500,600)
  - [ ] JetBrains Mono (weight: 400)
  - [ ] Material Symbols Outlined
- [ ] Instalar plugins de Tailwind:
  - [ ] `@tailwindcss/typography`
  - [ ] `@tailwindcss/forms`
  - [ ] `@tailwindcss/container-queries`
- [ ] Crear `app/globals.css` con variables CSS para dark mode
- [ ] Configurar next.config.js para optimizar fuentes

### 2.2 Componentes base
- [ ] Button (variantes: primary, secondary, ghost, icon)
- [ ] Badge (variantes: status, category, type)
- [ ] Card (con bordes y sombras del design)
- [ ] Input, Textarea (con focus states)
- [ ] Icon component (wrapper de Material Symbols)
- [ ] Layout components:
  - [ ] Navbar (fixed, glass effect, con logo, search, lang/topic/avatar)
  - [ ] SidebarLeft (categorías colapsables, iconos Material)
  - [ ] SidebarRight (TOC, recursos, CTA) — solo en artículo
  - [ ] Footer
- [ ] ThemeToggle (dark/light, localStorage)
- [ ] LanguageSwitcher (ES/EN pills)
- [ ] SearchBar (overlay con resultados, debounce, keyboard nav)
- [ ] ArticleRenderer:
  - [ ] remark-parse, remark-gfm, remark-rehype
  - [ ] rehype-highlight (syntax highlighting)
  - [ ] rehype-raw, rehype-sanitize
  - [ ] Plugin custom para Mermaid (detectar ```mermaid)
  - [ ] Clases CSS para imágenes (img-contained, img-full)
- [ ] MermaidRenderer (client-side con mermaid.js)
- [ ] CodeBlock (con filename, copy button, syntax highlighting)

---

## Fase 3: Sitio público (Next.js)

### 3.1 Páginas SSR
- [ ] `/` → redirect por Accept-Language (con fallback a /es)
- [ ] `/[lang]` → homepage con categorías (cards) + featured (lista)
- [ ] `/[lang]/[category]` → listado de artículos de categoría
- [ ] `/[lang]/[category]/[slug]` → artículo completo
- [ ] 404 page (con link al home)

### 3.2 Data fetching y API client
- [ ] Crear `lib/api-client.ts` (fetch wrapper con base URL, headers auto)
- [ ] Implementar carga de datos en server components (async/await)
- [ ] Mapeo de respuestas API a tipos del shared package
- [ ] Manejo de errores HTTP (404, 500, etc.)

### 3.3 i18n routing
- [ ] `lib/i18n.ts` con:
  - [ ] Diccionario `CATEGORY_I18N` (slug → {es, en})
  - [ ] Funciones `getCategorySlug`, `resolveCategory`
  - [ ] Lista de idiomas soportados
- [ ] Generar URLs correctas en links (usar slugs localizados)
- [ ] LanguageSwitcher funcional (cambia URL manteniendo categoría/slug)
- [ ] Mantener idioma en query params cuando sea necesario

### 3.4 SEO
- [ ] `generateMetadata` en cada página con:
  - [ ] title: `{title} — AI Hub` o default
  - [ ] description: resumen del artículo o default
  - [ ] canonical URL
  - [ ] hreflang links (alternates ES/EN)
  - [ ] og:title, og:description, og:type, og:url
- [ ] Sitemap XML endpoint (`/api/v1/sitemap`) — ya en backend, frontend solo consume
- [ ] robots.txt (estático o dinámico)

### 3.5 Layout y experiencia
- [ ] Sidebar izquierdo con categorías colapsables (obtenidas de API)
- [ ] En artículo: sidebar derecha con TOC (scroll-spy) + recursos
- [ ] Responsive:
  - [ ] Desktop: 3 column layout
  - [ ] Tablet: sidebars visibles pero ajustadas
  - [ ] Móvil: bottom navigation bar (4 items), hamburger menu
- [ ] Scroll spy para TOC (highlight sección actual)
- [ ] Scroll suave a anchors internos (#heading)

### 3.6 Búsqueda
- [ ] SearchBar en Navbar
- [ ] Overlay/modal con resultados
- [ ] Debounce 300ms → `GET /api/v1/search`
- [ ] Mostrar: título, snippet (highlighted), categoría, badge idioma
- [ ] Navegación por teclado (↑↓ Enter Escape)
- [ ] Click → navegar a artículo

---

## Fase 4: Panel de admin (Next.js)

### 4.1 Autenticación frontend
- [ ] `/admin/login` con email/password (form + validación)
- [ ] `lib/auth.ts`: guardar/leer/eliminar token en localStorage
- [ ] Middleware de Next.js para proteger `/admin/*` (excepto login)
- [ ] Logout (eliminar token + redirect)
- [ ] Redirección automática a login si no autenticado

### 4.2 Páginas del panel
- [ ] `/admin` — Dashboard:
  - [ ] Stats: total, published, draft, deprecated
  - [ ] Últimos 10 artículos modificados
  - [ ] Indicador de artículos pendientes de verificación (>30 días)
- [ ] `/admin/articles` — Lista con:
  - [ ] Tabla con columnas: título, categoría, tipo, estado, badges ES/EN, última edición, acciones
  - [ ] Filtros: estado, categoría, tipo, búsqueda
  - [ ] Paginación
  - [ ] Botón "Nuevo artículo"
- [ ] `/admin/articles/new` — Crear metadatos:
  - [ ] Form con campos: slug_uk, type, parent_id (solo tool-branch), category (dropdown dinámico), volatility, domains, featured
  - [ ] Validaciones (slug único, category válida, parent válido)
  - [ ] Tras crear → redirect a editor
- [ ] `/admin/articles/[id]` — Editor con pestañas:
  - [ ] **Metadatos**: editar category, volatility, featured, domains, applicable_as_of
  - [ ] **Contenido ES**: drag & drop .md, textarea, preview (título+resumen), botón Importar → `POST /api/v1/admin/articles/:id/content`
  - [ ] **Contenido EN**: igual que ES
  - [ ] **Relaciones**: agregar/eliminar related, prerequisite, next (con selector de artículos)
  - [ ] **Recursos**: listar vinculados, agregar (crear nuevo o vincular existente), desvincular
  - [ ] Indicadores de completitud por idioma (✅/⚠️/🕐)
  - [ ] Botones de verificación por idioma → `POST /api/v1/admin/articles/:id/verify`
- [ ] `/admin/resources` — CRUD de recursos (tabla + formulario modal)
- [ ] `/admin/images` — Upload a R2:
  - [ ] Drag & drop múltiple
  - [ ] Validación: tipo (png,jpg,webp,svg), tamaño (max 5MB)
  - [ ] Tras subir: mostrar URL pública + botón copiar
  - [ ] Historial de subidas recientes

### 4.3 UX admin
- [ ] Badges de estado con colores: draft (gris), published (verde), deprecated (rojo)
- [ ] Confirmaciones antes de publicar/deprecar
- [ ] Feedback visual (toast/snackbar) en success/error
- [ ] Loading states en botones
- [ ] Indicador "desactualizado" si `last_verified_at` es null o >30 días

---

## Fase 5: Integraciones y despliegue

### 5.1 Variables de entorno
- [ ] Crear `.env.example` para API (todos los campos del design.md)
- [ ] Crear `.env.example` para Web
- [ ] Documentar obtención de claves (Neon, Meilisearch, R2) en README

### 5.2 Docker Compose (dev)
- [ ] servicios: postgres (Neon local), meilisearch
- [ ] volúmenes persistentes para datos
- [ ] puertos expuestos (5432, 7700)
- [ ] Variables de entorno para los servicios
- [ ] Documentar cómo levantar entorno

### 5.3 Scripts de migración y seed
- [ ] Empaquetar SQL de schema en `packages/api/migrations/001_initial_schema.sql`
- [ ] Empaquetar seed de categorías en `002_seed_categories.sql`
- [ ] Script seed de admin user (bcrypt hash) en `seeds/001_admin_user.sql`
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
- [ ] 17 endpoints API funcionando (6 públicos + 11 admin)
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
