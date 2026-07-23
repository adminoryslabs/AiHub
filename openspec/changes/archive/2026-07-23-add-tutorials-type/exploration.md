# Exploration: Cómo evoluciona el eje `type` para incluir tutorials

## Estado actual

### Modelo de datos

El eje `type` actual distingue dos formas de artículo:

| type | Rol | Ejemplo |
|------|-----|---------|
| `concept` | Enciclopédico, tool-agnostic | "Qué es MCP", "Qué es un agente" |
| `tool-branch` | Enciclopédico, tool-specific, hijo de un concept | "MCP en Claude Code", "Skills en Cursor" |

El campo `parent_id` en `articles` vincula tool-branch → concept. La categoría `tools` agrupa las ramas tool-specific.

### Contenido existente (18 artículos)

**Concepts (9):** ai-coding-agents, ai-first-development, anatomy-of-a-prompt, common-prompting-mistakes, design-md-contract, edge-cases-with-ai, model-context-protocol, prompt-engineering, what-is-a-token

**Tool-branches (9):** claude-code-for-testing, getting-started-with-claude-design, stitch, stitch-infinite-canvas, stitch-screen-by-screen, stitch-vs-figma, subagents-in-claude-code, warp-terminal

### Observaciones clave sobre el contenido real

1. **`parent_id` inconsistente:** `stitch` y `warp-terminal` son `tool-branch` pero no declaran `parent` en su `admin.md`. Otros como `stitch-infinite-canvas` sí referencian `parent: ai-coding-agents`. Esto ya es deuda técnica.

2. **`tool-branch` ≠ siempre "rama de concept":** Algunos tool-branches (como `stitch-vs-figma` o `claude-code-for-testing`) no son tanto "cómo esta herramienta implementa el concepto padre" sino más bien guías prácticas sobre herramientas concretas. Están más cerca de lo que el usuario quiere llamar "tutorial".

3. **Conflicto editorial existente:** La sección 10 de `article-guidelines.md` dice explícitamente: *"Un tutorial paso a paso de principio a fin (eso es un curso)"* es lo que **NO** es un artículo del Hub. Introducir `tutorial` requiere redefinir esta frontera.

4. **Regla de categoría ambigua:** La sección 87 dice "las ramas tool-specific van en `tools`", pero el PRD (6.5) dice "pertenecen a la misma categoría que su artículo padre **y también** aparecen bajo Herramientas". En la práctica, todos los tool-branches existentes usan `category: tools`.

### Archivos afectados

| Archivo | Rol |
|---------|-----|
| `packages/api/migrations/001_initial_schema.sql` | CHECK constraint en `type` |
| `packages/api/src/routes/admin/articles.ts` | Validación Zod `z.enum(['concept', 'tool-branch'])` en CreateArticleSchema y ListQuerySchema |
| `packages/api/src/routes/public/articles.ts` | Filtro `type` en ListQuerySchema, lógica de ramas en detail |
| `packages/api/src/services/meilisearch.ts` | Campo `type` indexado como filterable |
| `packages/api/src/routes/public/search.ts` | Devuelve `type` en resultados |
| `packages/api/src/routes/public/sitemap.ts` | Usa `category` en URLs, no `type` — impacto indirecto |
| `packages/api/src/routes/public/categories.ts` | No usa `type` directamente — impacto mínimo |
| `docs/article-guidelines.md` | Definición de tipos, estructura canónica, checklist |
| `docs/hub_prd.md` | Modelo de datos, secciones 6.1, 6.2, 7 |
| `docs/context-summary.md` | Resumen del modelo |
| `articles/*/admin.md` | 18 archivos con `type` declarado |

---

## Opciones evaluadas

### Opción A: `type: concept | tool-branch | tutorial`

Tercer valor añadido al eje existente. `tool-branch` se mantiene para artículos enciclopédicos tool-specific. `tutorial` cubre guías prácticas paso a paso.

**Estructura canónica propuesta para `tutorial`:**

| # | Sección | Obligatoria | Notas |
|---|---------|-------------|-------|
| 1 | **Objetivo** | Sí | Qué vas a lograr al terminar. Máximo 2 párrafos. |
| 2 | **Prerrequisitos** | Sí | Qué necesitas saber/tener antes de empezar. Links a concepts. |
| 3 | **Pasos** | Sí | Numerados, con código real. Cada paso tiene input esperado y verificación. |
| 4 | **Resultado esperado** | Sí | Qué debería ver el lector si todo salió bien. |
| 5 | **Troubleshooting** | No | Errores comunes y cómo resolverlos. |
| 6 | **Siguiente paso** | No | Qué hacer después de completar este tutorial. |

**Impacto DB:**
- Migración: `ALTER TABLE articles DROP CONSTRAINT ... ; ALTER TABLE articles ADD CONSTRAINT ... CHECK (type IN ('concept', 'tool-branch', 'tutorial'));`
- Complejidad: Baja. Solo un CHECK constraint.
- Backfill: Ninguno necesario — no hay datos existentes que cambien.

**Impacto API:**
- `admin/articles.ts`: Actualizar `z.enum(['concept', 'tool-branch'])` → `z.enum(['concept', 'tool-branch', 'tutorial'])` en CreateArticleSchema y ListQuerySchema.
- `admin/articles.ts` línea 277-282: Las validaciones de `parent_id` deben extenderse: tutorial puede o no tener `parent_id` (un tutorial puede ser independiente o vinculado a un concepto).
- `public/articles.ts`: Actualizar ListQuerySchema. En detail, agregar lógica similar a tool-branches para mostrar tutorials relacionados.
- `meilisearch.ts`: El campo `type` ya es filterable, no requiere cambios de schema. Solo re-indexar si se quiere filtrar por tutorial.
- Endpoints rotos: **Ninguno**. Solo se extiende el enum.

**Impacto sitio público:**
- Rutas: Las URLs siguen `/{lang}/{category}/{slug}`. Un tutorial va en la categoría que le corresponda (agents, patterns, etc.) o en `tools` si es tool-specific. No cambia la estructura de URLs.
- Sidebar: Podría necesitar un badge o icono diferenciador para tutorials vs. concepts.
- Rendering: El componente de artículo necesita renderizar la estructura de tutorial (pasos numerados) en vez de la estructura de concepto.
- SEO: Sin impacto en URLs existentes. Los tutorials nuevos se indexan normalmente.

**Impacto admin:**
- Import flow: El selector de `type` en el formulario de importación agrega "Tutorial".
- Metadata: `applicable_as_of` puede aplicar a tutorials tool-specific. `parent_id` es opcional para tutorials (a diferencia de tool-branch donde es requerido).
- List filters: Agregar "Tutorial" al filtro de tipo.

**Impacto editorial:**
- `article-guidelines.md`: Agregar sección 1.3 Tutorial, sección 2.3 Estructura canónica de tutorial, actualizar checklist (sección 9).
- Re-clasificación: Algunos tool-branches existentes podrían migrarse a tutorial (ej: `claude-code-for-testing` es más tutorial que tool-branch enciclopédico). Pero esto es opcional y puede hacerse gradualmente.
- `admin.md`: Los nuevos tutorials declaran `type: tutorial`. Los existentes no cambian a menos que se decida re-clasificar.

**Migración de contenido existente:**
- Los 9 tool-branches existentes **no requieren migración**. Siguen siendo `tool-branch`.
- Si se decide re-clasificar algunos a `tutorial`, es un UPDATE manual por artículo.
- Los `admin.md` existentes no cambian.

**Esfuerzo:** **Bajo** — Cambio de enum + validaciones Zod + documentación editorial.

---

### Opción B: `type: concept | tutorial` (eliminar tool-branch)

Se elimina `tool-branch` como tipo. Las herramientas específicas se cubren de dos formas:
1. **Dentro del concepto padre:** La sección "Implementaciones por herramienta" del concepto se expande para incluir contenido tool-specific inline (no como artículos separados).
2. **Como tutorials:** Las guías prácticas sobre herramientas concretas pasan a ser `tutorial` con `parent_id` opcional.

**Impacto DB:**
- Migración: Cambiar CHECK constraint. Pero el problema real es `parent_id` — si ya no hay tool-branch, ¿`parent_id` sigue siendo necesario? Sí, porque un tutorial puede ser hijo de un concepto.
- Complejidad: **Media-Alta**. Requiere migrar los 9 tool-branches existentes.
- Backfill: **Obligatorio**. Cada tool-branch debe decidirse: ¿se convierte en tutorial? ¿Se mergea con su concepto padre? ¿Se elimina?

**Impacto API:**
- Mismo scope que Opción A para validaciones.
- La lógica de "obtener ramas de un concepto" en `public/articles.ts` (líneas 158-174) debe reescribirse para buscar tutorials hijos en vez de tool-branches.
- Los filtros `type` en admin y público pierden `tool-branch`.

**Impacto sitio público:**
- Las URLs existentes de tool-branches **NO cambian** (el slug está en `article_contents`, no depende del type).
- La sección "Implementaciones por herramienta" de los conceptos ahora mostraría tutorials en vez de tool-branches. Cambio de labeling, no de estructura.
- Posible confusión: un tutorial "MCP en Claude Code" y un concepto "MCP" — la relación padre/hijo se mantiene pero el tipo cambia.

**Impacto admin:**
- Eliminar "tool-branch" del selector de tipo.
- Los artículos existentes con `type: tool-branch` deben migrarse antes o durante el deploy.

**Impacto editorial:**
- Re-clasificación masiva: 9 artículos tool-branch → tutorial (o merge con concepto padre).
- Ambigüedad editorial: ¿"stitch-vs-figma" es un tutorial? No realmente — es una comparativa. ¿"claude-code-for-testing"? Más tutorial. La línea es borrosa.
- Se pierde la distinción entre "artículo enciclopédico sobre una herramienta" y "guía práctica paso a paso".

**Migración de contenido existente:**
- **9 tool-branches deben re-clasificarse.** Opciones por artículo:
  - `claude-code-for-testing` → `tutorial` (es una guía práctica)
  - `getting-started-with-claude-design` → `tutorial` (es una guía de inicio)
  - `stitch` → `concept` o `tutorial` (ambiguo)
  - `stitch-infinite-canvas` → `concept` o `tutorial`
  - `stitch-screen-by-screen` → `tutorial`
  - `stitch-vs-figma` → `concept` (comparativa, no tutorial)
  - `subagents-in-claude-code` → `concept` o `tutorial`
  - `warp-terminal` → `concept` (descripción de herramienta)
  - Riesgo: decisiones editoriales arduas y potencialmente inconsistentes.

**Esfuerzo:** **Alto** — Migración de contenido + decisiones editoriales por artículo + re-indexación.

---

### Opción C: `type: tutorial | guide` (refactor radical)

Reemplaza concept/tool-branch por un modelo mental diferente:
- `guide`: Contenido enciclopédico/referencia. Cubre conceptos, herramientas, comparativas. Lo que hoy son concepts Y tool-branches.
- `tutorial`: Contenido práctico/paso a paso. Guías hands-on.

**Por qué podría funcionar:** Unifica concepts y tool-branches bajo un solo tipo (`guide`), porque ambos son contenido de referencia — la diferencia es si son tool-agnostic o tool-specific, pero eso ya lo captura `parent_id` + metadata.

**Por qué NO funciona:**
1. **Pierde semántica clara:** `concept` y `tool-branch` comunican exactamente qué es cada artículo. `guide` es vago — ¿es un concepto? ¿una herramienta? ¿una comparativa?
2. **Rompe el mental model del PRD:** Todo el PRD, la visión, los guidelines están construidos alrededor de concept → tool-branch. Cambiar a guide → tutorial requiere reescribir documentos completos.
3. **Migración masiva sin ganancia clara:** Los 18 artículos deben re-clasificarse, pero ¿a qué? ¿Todos los concepts y tool-branches son "guides"? Técnicamente sí, pero la distinción se pierde.
4. **No resuelve el problema real:** El usuario quiere saber dónde van los tutorials, no reorganizar todo el modelo.
5. **`parent_id` pierde sentido:** Si ya no hay tool-branch, ¿por qué un guide tendría padre? Pero sí tiene sentido que un tutorial esté vinculado a un concepto.

**Esfuerzo:** **Muy Alto** — Reescritura de PRD, guidelines, migración de todo el contenido, re-indexación, re-diseño de sidebar y navegación.

---

## Recomendación

**Opción A: `type: concept | tool-branch | tutorial`.**

Razones:

1. **Mínimo cambio, máxima ganancia.** El eje `type` crece de 2 a 3 valores. No rompe nada existente. No requiere migración de contenido.

2. **Respeta la semántica actual.** `concept` y `tool-branch` siguen significando lo mismo. `tutorial` agrega una dimensión nueva sin confundir las existentes.

3. **Permite re-clasificación gradual.** Si en el futuro se decide que algunos tool-branches son realmente tutorials, se migran individualmente. No es un requisito para lanzar.

4. **Coexiste con el modelo en árbol.** Un tutorial puede ser hijo de un concepto (`parent_id`) o independiente. Ejemplo: "Cómo conectar el MCP de Supabase" → `type: tutorial`, `parent: model-context-protocol`, `category: tools`.

5. **La guía de `article-guidelines.md` ya tiene la distinción mental.** La sección 10 dice "un tutorial paso a paso no es un artículo del Hub" — pero eso se refiere a que no era el formato del Hub. Ahora lo es, como un tipo nuevo con su propia estructura.

### Definición operativa propuesta

| Criterio | concept | tool-branch | tutorial |
|----------|---------|-------------|----------|
| ¿Explica QUÉ es algo? | Sí | No (explica CÓMO en una herramienta) | No (explica CÓMO hacer algo) |
| ¿Es tool-agnostic? | Sí | No | Puede o no |
| ¿Tiene pasos ejecutables? | No | Parcialmente | Sí, siempre |
| ¿Tiene parent_id? | Nunca | Siempre | Opcional |
| ¿Tiene applicable_as_of? | No | Sí | Si es tool-specific |
| Ejemplo | "Qué es MCP" | "MCP en Claude Code" | "Cómo conectar el MCP de Supabase" |

### Diferencia clave: tool-branch vs. tutorial

La frontera es:
- **tool-branch**: "Cómo esta herramienta implementa X concepto" — es referencia, no instrucción. Ejemplo: "MCP en Cursor" describe cómo Cursor integra MCP, sus particularidades, configuración.
- **tutorial**: "Cómo lograr X resultado usando esta herramienta" — es instrucción paso a paso. Ejemplo: "Cómo crear un MCP server para PostgreSQL" es un tutorial.

Un tool-branch **describe**. Un tutorial **enseña haciendo**.

---

## Riesgos

### Riesgo 1: Ambigüedad tool-branch vs. tutorial
**Severidad: Media**
Algunos artículos podrían ser cualquiera de los dos. Ejemplo: "subagents-in-claude-code" — ¿es tool-branch (referencia) o tutorial (guía práctica)?
**Mitigación:** La estructura canónica es diferente. Si tiene pasos numerados con verificación, es tutorial. Si describe configuración y particularidades, es tool-branch. Documentar la regla de decisión en los guidelines.

### Riesgo 2: URL no cambia, pero la semántica sí
**Severidad: Baja**
Las URLs usan `/{lang}/{category}/{slug}`, no incluyen `type`. Los tutorials nuevos van en la categoría que corresponda. No hay riesgo de SEO.
**Mitigación:** Ninguna necesaria.

### Riesgo 3: Confusión con "Lo que NO es un artículo del Hub"
**Severidad: Media**
La sección 10 de los guidelines dice explícitamente que un tutorial no es un artículo del Hub. Introducir `type: tutorial` contradice esto.
**Mitigación:** Actualizar la sección 10 para reflejar que los tutorials SON parte del Hub, pero con estructura propia (no "tutorial de YouTube con intro de 3 minutos", sino guía técnica concisa).

### Riesgo 4: Complejidad en la sidebar y navegación
**Severidad: Baja**
Agregar un tercer tipo puede requerir un badge o separador visual en la sidebar.
**Mitigación:** Los filtros de tipo ya existen en la API. El frontend puede mostrar "Tutorials" como sección separada o integrarlos con un badge.

---

## ¿Listo para proposal?

**Sí.** La Opción A es clara, de bajo riesgo, y el análisis cubre:

- ✅ Cambio de schema (CHECK constraint)
- ✅ Cambio de validaciones (Zod)
- ✅ Impacto en endpoints (extensión, no rotura)
- ✅ Impacto editorial (nueva sección en guidelines, estructura canónica de tutorial)
- ✅ Migración de contenido (ninguna obligatoria, re-clasificación gradual opcional)
- ✅ Riesgos identificados y mitigados

**Próximo paso:** `sdd-propose` con la Opción A como enfoque elegido.
