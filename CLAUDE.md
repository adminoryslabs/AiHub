# AI Hub — Instrucciones para agentes

> Este archivo es leído automáticamente por Claude Code al trabajar en este proyecto.
> Todo agente que trabaje en AI Hub debe leerlo antes de tomar cualquier decisión.

---

## Qué es este proyecto

AI Hub es un hub de conocimiento comunitario sobre IA generativa. Referencia práctica, enciclopédica en estructura, bilingüe (ES + EN), orientada a desarrolladores y builders.

**Documentos de referencia en `docs/`:**
- `docs/hub_vision.md` — visión completa del producto (largo plazo)
- `docs/hub_prd.md` — PRD del MVP, fuente de verdad para el alcance actual
- `docs/architecture.md` — decisiones técnicas de stack e infra
- `docs/context-summary.md` — resumen ejecutivo de todas las decisiones tomadas
- `docs/article-guidelines.md` — lineamientos de creación de artículos (estructura, tono, metadatos)

Leer `docs/hub_prd.md` y `docs/architecture.md` antes de cualquier trabajo de diseño o implementación.
Leer `docs/article-guidelines.md` antes de crear o revisar contenido.

---

## Stack definido (no renegociar sin consultar al usuario)

| Capa | Decisión |
|------|----------|
| Frontend | Next.js (SSR/SSG) — salida standalone en Docker, VPS compartida |
| Backend | Express (Node.js) — Docker Compose, VPS compartida |
| Base de datos | PostgreSQL — motor compartido de la VPS (una base y un rol por app) |
| Búsqueda | Meilisearch — sidecar privado en la VPS |
| Storage | Cloudflare R2 |

### Despliegue (VPS compartida de OrysLabs, detrás de Traefik)

Web y API son dos stacks independientes. Ningún contenedor publica puertos y no
se usa Vercel, NAS ni Fly.io.

| Pieza | Carpeta en la VPS | Imagen | Workflow |
|-------|-------------------|--------|----------|
| Web | `/opt/apps/aihub-web` | `ghcr.io/adminoryslabs/aihub-web` | `.github/workflows/publish-web.yml` |
| API | `/opt/apps/aihub` | `ghcr.io/adminoryslabs/aihub-app` | `.github/workflows/publish.yml` |

Las imágenes se construyen en GitHub Actions y se publican en GHCR; la VPS solo
las baja. Runbook completo en `docs/deployment.md`.

- La web llama a la API por `https://api-aihub.oryslabs.com`, no por la red interna.
- `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_SITE_URL` se inlinean en el build: se pasan
  como build args desde variables de repositorio. Cambiarlas exige recompilar.
- El build de la web instala `@adminoryslabs/design-system` desde GitHub Packages
  con el secreto `NPM_TOKEN` montado como secreto de BuildKit.

### Design system

- Estilos desde `@adminoryslabs/design-system` v2.2.0: preset de Tailwind
  (`orys-*`), CSS de tokens y script `theme-init`. Tema por `data-theme` y
  `data-line="academy"`.
- **No se usa Google Fonts**: las fuentes (Inter, JetBrains Mono) las sirve el
  paquete desde el bundle.
- Los íconos son **Lucide** (`lucide-react`) mediante `components/ui/Icon.tsx`.

---

## Acuerdo SDD — leer antes de iniciar cualquier fase

El Hub tiene dos módulos interdependientes:
1. **Sitio público** — lo que ve el lector (artículos, búsqueda, navegación)
2. **Panel de admin** — lo que usa el admin (importación de markdown, gestión de metadatos, publicación)

### Regla crítica: ambos módulos existen simultáneamente

Cualquier decisión de diseño en un módulo debe considerar el impacto en el otro. No se diseña ni implementa un módulo ignorando al otro.

### Orden obligatorio en `sdd-design`

```
1. Fundación compartida  ← SIEMPRE PRIMERO
   - Schema completo de base de datos
   - Contratos de API (endpoints consumidos por ambos módulos)
   - Modelo de autenticación

2. Módulo: Sitio público
   (referencia explícita a la fundación compartida)

3. Módulo: Panel de admin
   (referencia explícita a la fundación compartida)
```

Este orden se aplica también en `sdd-spec` y `sdd-tasks`: primero los contratos compartidos, luego los específicos de cada módulo.

### Por qué importa

El sitio público consume datos que el admin produce. Si se diseñan por separado sin una fundación común, el implementador tomará decisiones contradictorias. La API y el schema son el contrato que une ambos módulos — deben existir antes que cualquier spec de interfaz.

---

## Reglas del proyecto

- Código y comentarios en español. Variables y funciones en inglés.
- El panel de admin no tiene editor de texto enriquecido — los artículos se importan como archivos `.md`.
- SEO es prioridad desde el día uno. Ninguna ruta de contenido público puede ser client-side only.
- La búsqueda usa Meilisearch con sinónimos configurables. Embeddings vectoriales son Fase 2.
- No hacer commit ni push sin confirmación explícita del usuario.
