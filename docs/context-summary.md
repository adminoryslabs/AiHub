# Context Summary — AI Hub

> Resumen ejecutivo de todas las decisiones tomadas durante la fase de definición.
> Destinado a ser pasado como input a cualquier agente o modelo que trabaje en este proyecto.
> Fecha de última actualización: 2026-04-07

---

## Qué es AI Hub

Un hub de conocimiento comunitario sobre IA generativa. No es un blog, no es un directorio, no es una plataforma de cursos. Es una referencia práctica viva — enciclopédica en estructura, práctica en contenido — para desarrolladores y builders que quieren entender y usar conceptos de IA generativa.

Es bilingüe desde el día uno: español neutral e inglés. Ambas versiones son ciudadanas de igual rango.

AI Hub es la Fase 1 de un plan mayor (ver `El_gran_plan.md`): construir una AI Academy. El Hub genera comunidad y contenido que sostiene las fases siguientes (talleres, cursos, programas completos).

---

## Documentos disponibles

| Archivo | Contenido |
|---------|-----------|
| `hub_vision.md` | Visión completa del producto: modelo comunitario, ciclo de vida de artículos, sistema de obsolescencia, roadmap de capacidades |
| `hub_prd.md` | PRD del MVP. Fuente de verdad para el alcance actual. Leer completo antes de diseñar. |
| `architecture.md` | Decisiones de stack e infra con rationale |
| `CLAUDE.md` | Instrucciones para agentes que trabajan en este proyecto |
| `El_gran_plan.md` | Contexto del plan completo (academy, fases, visión de negocio) |
| `ai_wiki_mvp_prd.md` | PRD legacy. Reemplazado por `hub_prd.md`. Solo referencia histórica. |

---

## Modelo de contenido

### Estructura en árbol
Los artículos se organizan en concepto principal + ramas por herramienta:

```
MCP (artículo principal — concepto agnóstico)
├── MCP en Claude Code
├── MCP en Cursor
└── MCP en OpenCode
```

El artículo principal cubre el concepto de forma tool-agnostic. Las ramas cubren la implementación concreta en cada herramienta.

### Tipos de artículo
- `concept` — artículo principal, cubre el concepto
- `tool-branch` — rama tool-specific, cubre la implementación en una herramienta concreta

### Categorías (5)

| Categoría | Contenido |
|-----------|-----------|
| Fundamentos | LLMs, IA generativa, tokens, embeddings |
| Agentes | Agentes, memoria, tool use, ReAct, skills, rules |
| Prompting | Diseño de prompts, técnicas |
| Patrones | RAG, workflows, arquitecturas |
| Herramientas | Claude Code, Cursor, MCP, OpenCode — con ramas tool-specific |

### Dominios
Los dominios son etiquetas (`domains: string[]`) transversales a las categorías. En el MVP todos los artículos tienen el dominio `programming`. El selector de dominio no aparece en la UI hasta que exista más de un dominio. Esto permite escalar a `marketing`, `video`, etc. sin cambios estructurales.

---

## Decisiones clave del PRD

### Bilingüismo
- Cada artículo tiene dos entidades de contenido independientes: una por idioma (`es`, `en`)
- Los metadatos estructurales son compartidos. El contenido (título, resumen, body) es independiente por idioma.
- `last_verified_at` y `last_edited_at` se registran por idioma
- URLs con idioma en la ruta: `/{lang}/{category-slug}/{article-slug}`

### Ciclo de vida de artículos (MVP simplificado)
```
Borrador → Publicado → Deprecado
```
El admin publica directamente. Los estados Flagged y En revisión se incorporan cuando se sumen editores.

### Media en artículos
- **Imágenes**: inline en el `body` markdown. Dos modos: `contained` (default, max ~700px centrada) y `full` (ancho de columna). Controlado con atributo `{.full}` en markdown. Alojadas en Cloudflare R2.
- **Diagramas**: Mermaid renderizado inline como bloque de código. Texto puro, se versiona con el artículo.
- **Videos**: NO embeds inline en MVP. Solo en la sección de Recursos externos (tipo: `video`).

### Búsqueda
Motor: **Meilisearch**. Full-text con tolerancia a typos, ponderación por campo (título > resumen > body), sinónimos configurables. Busca en ambos idiomas simultáneamente. Embeddings vectoriales (búsqueda semántica real) se añaden en Fase 2 sin cambiar la arquitectura base.

### Panel de admin
No tiene editor de texto enriquecido. Los artículos se escriben en un editor externo (Obsidian, VS Code, etc.) y se importan como archivos `.md`. El panel gestiona: importación, metadatos, estado, recursos externos, subida de imágenes, publicación.

Autenticación: email + contraseña. Un único usuario admin en el MVP.

### SEO
Prioridad desde el día uno. URLs semánticas con idioma en la ruta, meta tags, hreflang entre versiones de idioma, sitemap automático, Open Graph. Ninguna ruta de contenido público puede ser client-side only.

---

## Stack técnico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| Frontend | Next.js → Vercel | SSR nativo obligatorio para SEO |
| Backend | Express → Fly.io | Escala con background jobs y agentes; equipo lo conoce |
| Base de datos | PostgreSQL vía NeonDB | PostgreSQL puro, branching para dev/staging, scale to zero |
| Búsqueda | Meilisearch Cloud | Self-hostable, fácil de operar, full-text con sinónimos |
| Storage | Cloudflare R2 | Sin egress fees, compatible con S3 |

Costo MVP: ~$0/mes. Path de escalado: Hetzner VPS (~€4-6/mes) para Express + Meilisearch self-hosted cuando superen los límites del free tier.

---

## Acuerdo SDD — crítico

El Hub tiene dos módulos interdependientes que deben tratarse en **un único SDD**:

1. **Sitio público** — artículos, búsqueda, navegación, bilingüismo
2. **Panel de admin** — importación markdown, metadatos, publicación, imágenes

### Orden obligatorio en `sdd-design`

```
1. Fundación compartida  ← SIEMPRE PRIMERO
   - Schema completo de base de datos
   - Contratos de API
   - Modelo de autenticación

2. Módulo: Sitio público

3. Módulo: Panel de admin
```

Ningún módulo se diseña ni implementa sin tener la fundación compartida definida y aprobada. Cualquier decisión en un módulo debe considerar el impacto en el otro.

---

## Lo que NO es el MVP

- Contribuciones públicas abiertas
- Sistema de revisión entre pares
- Agentes IA en background
- Dashboard editorial avanzado
- Feedback de lectores
- Learning paths
- "Ask to the article"
- Búsqueda semántica por embeddings
- Selector de dominio en UI (solo existe `programming`)
- Embeds de video inline en artículos
