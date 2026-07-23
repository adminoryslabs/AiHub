# Proposal — add-tutorials-type

## Resumen

Se introduce `tutorial` como tipo de artículo y se elimina `tool-branch`, reduciendo el eje `type` a `concept | tutorial`. Se elimina la columna `parent_id` (reemplazada por `article_relations`), se agregan `difficulty` y `estimated_time` para tutorials, y se crea la ruta `/es/tutoriales/{slug}` / `/en/tutorials/{slug}`.

## Por qué este enfoque

Se elige la Opción B del [exploration.md](./exploration.md): eliminar `tool-branch`. El análisis de los 8 tool-branches existentes reveló que `tool-branch` es un scope label, no un tipo real — la mitad son guías prácticas (tutorials) y la otra mitad son artículos conceptuales sobre herramientas. Mantenerlo forzaría dos dimensiones de clasificación para cubrir el mismo espectro. La relación padre-hijo que `parent_id` resolvía se cubre completamente con `article_relations` (`prerequisite`, `next`), que ya existen en el schema.

## Alcance incluido

### Base de datos
- Migración: `DROP CHECK` actual, `ADD CHECK (type IN ('concept', 'tutorial'))`
- `ALTER TABLE articles DROP COLUMN parent_id`
- `ALTER TABLE articles ADD COLUMN difficulty VARCHAR(15) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))`
- `ALTER TABLE articles ADD COLUMN estimated_time VARCHAR(50)`
- UPDATE de 8 filas: 4 → `tutorial`, 4 → `concept` categoría `tools`
- `applicable_as_of` se **mantiene** y queda disponible para cualquier `type` cuando el artículo sea tool-specific (un tutorial "Cómo conectar el MCP de Supabase" puede declarar `applicable_as_of: 'julio 2026'`)

### API (Express/Zod)
- `admin/articles.ts`: actualizar `z.enum` en CreateArticleSchema y ListQuerySchema; eliminar validación de `parent_id`; agregar `difficulty` y `estimated_time`; eliminar lógica de ramas (líneas 158-174, 378-380)
- `public/articles.ts`: actualizar ListQuerySchema; eliminar filtro por `parent_id`; reescribir lógica de artículos relacionados vía `article_relations` en vez de `parent_id`
- `meilisearch.ts`: reindexar documentos tras migración de `type`
- Nuevo endpoint `GET /public/tutorials` (listado paginado por `difficulty` opcional)

### Sitio público (Next.js)
- Nueva ruta `/[lang]/tutoriales/[slug]` (ES) / `/[lang]/tutorials/[slug]` (EN)
- Renderizado condicional por `type`: estructura de tutorial (pasos numerados, verificación, troubleshooting) vs. estructura de concepto
- Sidebar: 5 categorías conceptuales + sección "Tutoriales" / "Tutorials" con filtro por `difficulty`
- SEO: `hreflang`, sitemap, Open Graph para las nuevas rutas

### Panel de admin
- Import flow: selector de tipo `concept | tutorial`; campos nuevos `difficulty`, `estimated_time` para tutorial
- Lista de artículos: filtro por `type`, columna `difficulty`
- Eliminar referencias a `parent_id` y `applicable_as_of` en formularios y vistas
- Metadata de artículo en admin refleja el nuevo schema

### Editorial (docs)
- `article-guidelines.md`: eliminar §1.2 (tool-branch) y §2.2; agregar estructura canónica de tutorial (Objetivo, Prerrequisitos, Pasos, Resultado, Troubleshooting, Siguiente paso); revertir §10 (tutorials SÍ son parte del Hub); actualizar checklist §9 y metadatos §3
- `hub_prd.md`: actualizar §6.1, §6.2, §6.5, §7 (modelo de datos)
- `hub_vision.md`: actualizar §5.1, §5.3, §5.4
- `context-summary.md`: actualizar sección "Modelo de contenido" y "Tipos de artículo"

### Migración de contenido
| Artículo | De | A |
|----------|----|----|
| `claude-code-for-testing` | tool-branch | tutorial |
| `getting-started-with-claude-design` | tool-branch | tutorial |
| `stitch-infinite-canvas` | tool-branch | tutorial |
| `stitch-screen-by-screen` | tool-branch | tutorial |
| `stitch` | tool-branch | concept (tools) |
| `warp-terminal` | tool-branch | concept (tools) |
| `stitch-vs-figma` | tool-branch | concept (tools) |
| `subagents-in-claude-code` | tool-branch | concept (tools) |

> Sin archivos `admin.md` en disco, la clasificación se validará editorialmente durante la importación.

## Alcance no incluido

- Multi-dominio (`marketing`, `video`, etc.) — sigue con solo `programming`
- Learning paths o secuencias automatizadas de tutorials
- Embeddings / búsqueda semántica (Fase 2)
- Sistema de contribuciones públicas
- Progreso de lector o tracking de tutorials completados
- Modificación al modelo de `resources` o `article_resources`

## Riesgos aceptados

| Riesgo | Mitigación |
|--------|------------|
| Clasificación editorial incorrecta de los 8 artículos migrados | La migración es reversible. Los criterios de clasificación se documentan en `article-guidelines.md` (tutorial = pasos numerados con verificación; concept = referencia/descripción). Revisión editorial manual post-migración. |
| El nuevo patrón de URL `/tutoriales/{slug}` rompe el principio actual de que la URL depende solo de `category` | Es una decisión consciente: tutorials no pertenecen a una categoría conceptual sino a una sección transversal propia. Se documenta en el PRD. Las URLs legacy de conceptos no cambian. |
| Consumidores externos de la API pierden el campo `parent_id` y `tool-branch` | Rompimiento controlado: el Hub está en fase pre-lanzamiento, sin consumidores externos. Se versiona la API si fuera necesario en el futuro. |
| Reindexación completa de Meilisearch requerida tras cambiar `type` | Se incluye en el plan de migración como paso atómico. Tiempo de reindex estimado < 2 min para ~18 documentos. |
| Revertir §10 de `article-guidelines.md` contradice la intención editorial documentada hasta ahora | La reversión se justifica explícitamente en el diff de guidelines: el Hub sí incluye tutorials, simplemente con estructura propia. No son cursos, son guías técnicas concisas. |

## Plan de rollback

1. Restaurar backup de base de datos (pre-migración)
2. Revertir migración de schema: restaurar CHECK `('concept', 'tool-branch')`, restaurar `parent_id`, eliminar `difficulty` y `estimated_time`
3. Revertir 8 artículos a `type: tool-branch`
4. Reindexar Meilisearch con schema original
5. Revertir rutas `/tutoriales` → redirigir a `/herramientas/{slug}`
6. Revertir docs a versión pre-cambio

## Resultado operativo

- El admin importa artículos como `concept` o `tutorial`. Los tutorials declaran `difficulty` y `estimated_time`. Ya no existe `parent_id` — las relaciones se gestionan vía la pestaña Relaciones del panel.
- El lector navega 5 categorías conceptuales en el sidebar + sección "Tutoriales" independiente, filtrable por dificultad. Un tutorial se renderiza con pasos numerados, verificación y troubleshooting.
- Las URLs de tutorial son `/es/tutoriales/{slug}` y `/en/tutorials/{slug}`. Los conceptos mantienen `/{lang}/{category}/{slug}`.

## Estimación de tamaño

| Superficie | LOC estimado |
|------------|-------------|
| Migración SQL | ~30 (nuevo archivo) |
| API (admin + public + search + sitemap) | ~120 (modificados) |
| Frontend — rutas y renderizado | ~150 (nuevo + modificado) |
| Frontend — admin panel | ~80 (modificado) |
| Docs (4 archivos) | ~200 (modificado) |
| **Total** | **~580** |

> **⚠️ Riesgo alto de superar el presupuesto de 400 líneas por PR.** Este cambio toca 4 dominios (DB, API, frontend público, admin) más 4 documentos. El orchestrator deberá planificar chained PRs en `sdd-tasks`: (1) DB + API, (2) frontend público + rutas, (3) admin panel, (4) docs editoriales.
