# Lineamientos de creación de artículos — AI Hub

> Este documento es la fuente de verdad para cualquier agente o editor que cree contenido en AI Hub.
> Antes de redactar un artículo, leer este documento completo.
> Versión: 1.0 | Última revisión: 2026-04-11

---

## 1. Tipos de artículo

### 1.1 Concepto (`type: concept`)

Cubre un concepto de IA generativa de forma **tool-agnostic** o **tool-specific**. No depende de ninguna herramienta específica en su forma pura, pero puede cubrir herramientas concretas como categoría.

Ejemplos: *Qué es un LLM*, *Qué es RAG*, *Qué es un agente*, *Stitch*, *Warp Terminal*.

### 1.2 Tutorial (`type: tutorial`)

Guía práctica paso a paso que cubre un **resultado específico y verificable**. Tiene `difficulty` (beginner/intermediate/advanced) y `estimated_time` (ej: "30 min"). No pertenece a una categoría propia — se agrupa bajo la sección transversal "Tutoriales".

Ejemplos: *Claude Code para testing*, *Diseño UI con Stitch pantalla a pantalla*, *Conectar MCP de Supabase*.

---

## 2. Estructura canónica

### 2.1 Artículo concepto

Las secciones deben aparecer en este orden. No omitir ninguna salvo que se indique explícitamente que no aplica.

| # | Sección | Obligatoria | Notas |
|---|---------|-------------|-------|
| 1 | **Qué es** | Sí | Definición directa. Máximo 3 párrafos. Sin jerga innecesaria. |
| 2 | **Modelo mental** | Sí | La intuición detrás del concepto. Una analogía, diagrama Mermaid o comparativa. |
| 3 | **Cómo se usa** | Sí | Práctico. Con ejemplos de código cuando aplique. |
| 4 | **Cuándo usarlo / cuándo no** | Sí | Dos columnas o dos listas. Criterio de decisión real, no marketing. |
| 5 | **Historia y evolución** | No | Colapsable (`<details>`). Solo si aporta contexto relevante. |

Los **conceptos relacionados** y **recursos externos** no van dentro del Markdown importable. Se gestionan como metadatos relacionales desde el panel admin para evitar links rotos, duplicidad y contenido difícil de mantener.

### 2.2 Tutorial

| # | Sección | Obligatoria | Notas |
|---|---------|-------------|-------|
| 1 | **Objetivo** | Sí | Qué va a lograr el lector. Máximo 2 párrafos. |
| 2 | **Prerrequisitos** | Sí | Qué necesita saber o tener instalado. Links a conceptos relacionados. |
| 3 | **Pasos** | Sí | Numerados, cada uno con input esperado y verificación. |
| 4 | **Resultado esperado** | Sí | Qué se logra al terminar. Criterio de éxito verificable. |
| 5 | **Troubleshooting** | No | Problemas comunes y soluciones. Colapsable si es largo. |
| 6 | **Siguiente paso** | No | Link al siguiente tutorial o concepto relacionado. |

---

## 3. Metadatos

Cada artículo tiene metadatos estructurales que deben definirse antes de redactar el contenido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `slug_uk` | string | Slug canónico en inglés. Ej: `what-is-an-llm`. Solo minúsculas y guiones. |
| `type` | enum | `concept` o `tutorial` |
| `category` | string | Ver sección 4. Para tutoriales, se usa solo como referencia interna (no aparece en la URL). |
| `difficulty` | enum \| null | `beginner` / `intermediate` / `advanced`. Requerido para tutoriales, null para conceptos. |
| `estimated_time` | string \| null | Duración estimada. Ej: `"30 min"`, `"1 hour"`. Requerido para tutoriales, null para conceptos. |
| `volatility` | enum | `low` / `medium` / `high`. Ver criterios abajo. |
| `featured` | boolean | Solo marcar si el artículo es adecuado para la homepage. Ser selectivo. |
| `applicable_as_of` | string \| null | Opcional para cualquier type. Versión o fecha del estado de la herramienta cuando el artículo describe comportamiento tool-specific. Ej: `v2.1`, `abril 2026`. |

### Criterios de volatilidad

| Valor | Cuándo usar |
|-------|-------------|
| `low` | Conceptos fundamentales que cambian muy poco. Ej: qué es un transformer, qué es tokenización. |
| `medium` | Patrones y prácticas que evolucionan gradualmente. Ej: técnicas de prompting, arquitecturas de agentes. |
| `high` | Implementaciones tool-specific, APIs que cambian entre versiones, precios, límites de modelos. |

---

## 4. Categorías disponibles

| Slug | Nombre ES | Nombre EN | Qué contiene |
|------|-----------|-----------|--------------|
| `fundamentals` | Fundamentos | Fundamentals | Conceptos base de LLMs, tokens, contexto, embeddings, fine-tuning |
| `agents` | Agentes | Agents | Agentes, herramientas, memoria, orquestación, multi-agente |
| `prompting` | Prompting | Prompting | Técnicas de prompting, chain-of-thought, few-shot, system prompts |
| `patterns` | Patrones | Patterns | RAG, function calling, structured output, evals, guardrails |
| `tools` | Herramientas | Tools | Conceptos sobre herramientas concretas (Stitch, Warp, etc.) |

Regla: los conceptos sobre herramientas van en `tools`. Los tutorials no tienen categoría propia; se agrupan bajo la sección Tutoriales de la navegación.

---

## 5. Relaciones y recursos externos

### 5.1 Conceptos relacionados

Los conceptos relacionados se gestionan desde la pestaña **Relaciones** del panel admin, no como links manuales dentro del Markdown.

Tipos disponibles:

| Tipo | Uso |
|------|-----|
| `related` | Conceptos conectados lateralmente. Aparecen como "Artículos relacionados". |
| `prerequisite` | Conceptos que conviene entender antes. Aparecen como "Antes de leer este artículo". |
| `next` | Siguiente lectura sugerida. Aparece como tarjeta de navegación. |

Las relaciones son direccionales: si A se relaciona con B, B no se relaciona automáticamente con A.

Al crear un artículo, el agente debe proponer relaciones como lista separada usando `slug_uk` o título, pero no insertarlas en el cuerpo del artículo.

### 5.2 Recursos externos

Cada artículo debe incluir recursos curados en el campo `resources` de la base de datos (no inline en el Markdown). El cuerpo del artículo no incluye sección de recursos; estos se vinculan desde el panel admin y se renderizan en el sidebar derecho.

### Tipos de recurso

| Tipo | Cuándo usar |
|------|-------------|
| `doc` | Documentación oficial, papers, especificaciones |
| `video` | Videos de YouTube/Vimeo. Preferir contenido técnico sobre divulgativo. |
| `course` | Cursos estructurados (gratuitos o de pago) |
| `article` | Posts de blog, artículos académicos o de ingeniería de alta calidad |

### Criterios de calidad para recursos

- Fuente reconocida o autor con trayectoria en el campo
- Contenido técnico, no marketing
- Vigente (no más de 3 años salvo que sea referencia histórica fundamental)
- Mínimo 2 recursos por artículo. Máximo recomendado: 6.

---

## 6. Lineamientos de escritura

### Tono y voz

AI Hub habla como un colega que sabe de lo que habla y te lo cuenta sin rodeos. No es un paper académico, no es un blog corporativo, no es un tutorial de YouTube con intro de 3 minutos. Es alguien que te acompaña.

**Lo que eso significa en la práctica:**

- **Directo.** El primer párrafo ya define el concepto. Sin "en este artículo exploraremos...".
- **Práctico.** Si algo se puede explicar con un ejemplo de código real, mejor que con tres párrafos de teoría.
- **Sin formalidad forzada.** Está bien usar "básicamente", "en pocas palabras", "ojo con esto". No está bien usar "cabe destacar que", "en consecuencia", "en el ámbito de".
- **Sin marketing.** Prohibido: *"revolucionario"*, *"increíble"*, *"cambia todo"*, *"el futuro de"*. Si algo es importante, el contenido lo demuestra solo.
- **Voz activa.** "El modelo predice el siguiente token" en vez de "el siguiente token es predicho por el modelo".

### Nivel técnico

El lector sabe programar. Probablemente lleva meses o años trabajando con código. Lo que no necesariamente tiene es contexto profundo de IA generativa — para eso está el Hub.

- Asumir conocimientos de programación básicos-intermedios. No explicar qué es un array.
- Explicar conceptos de IA la primera vez que aparecen, aunque sea en una frase.
- Si el concepto tiene artículo propio en el Hub, linkearlo en su primera aparición en vez de explicarlo.
- Los términos técnicos en inglés que no tienen traducción establecida (token, embedding, prompt, fine-tuning) se usan en inglés directamente — sin itálicas, sin disculpas.

### Ejemplos de código

- Código real y funcional. No pseudocódigo salvo que sea más claro.
- Incluir el nombre del lenguaje en el bloque de código.
- Si el ejemplo es largo, incluir solo la parte relevante con comentarios que indiquen el contexto.
- Para ramas tool-specific: usar la versión de la herramienta indicada en `applicable_as_of`.

### Diagramas (Mermaid)

- Usar para ilustrar arquitecturas, flujos o modelos mentales cuando una figura aporta más que el texto.
- No usar para información que se puede expresar en una tabla o lista.
- Incluirlos en la sección **Modelo mental** preferentemente.

---

## 7. Bilingüismo

El Hub es bilingüe (ES + EN). Cada artículo tiene dos entidades de contenido independientes.

### Slugs por idioma

El slug de cada idioma va en `article_contents.slug` y forma parte de la URL:

- `slug` ES: en español neutro. Ej: `que-es-un-llm`
- `slug` EN: en inglés. Ej: `what-is-an-llm`

El `slug_uk` (canónico) siempre es en inglés y se usa para referencias internas entre artículos.

### Reglas de traducción

- **No traducir literalmente**. Reescribir para el lector nativo de cada idioma.
- Los ejemplos de código no se traducen. Los comentarios del código sí pueden adaptarse.
- Los nombres de secciones siguen la estructura canónica en cada idioma (ver tabla 2.1).
- Los términos técnicos en inglés se mantienen en español si no tienen traducción establecida (ej: *token*, *embedding*, *prompt*). En caso de duda, usar el término inglés con una aclaración la primera vez.

### Independencia de versiones

Ambas versiones comparten metadatos estructurales pero el contenido es independiente. Una versión puede estar más actualizada que la otra — esto se registra en `last_edited_at` y `last_verified_at`.

---

## 8. Formato del archivo `.md`

El archivo markdown que se importa al admin debe seguir esta estructura de frontmatter + cuerpo:

```markdown
---
title: "Título del artículo"
slug: "slug-del-articulo"
summary: "Resumen corto del artículo (1-2 frases). Se usa en cards, SEO y búsqueda."
lang: es
---

## Qué es

...

## Modelo mental

...

## Cómo se usa

...

## Cuándo usarlo / cuándo no

...

## Historia y evolución

<details>
<summary>Ver historia</summary>

...

</details>
```

### Reglas del frontmatter

- `title`: El título que aparece en la página. No incluir el nombre del hub.
- `slug`: Debe coincidir exactamente con el valor registrado en `article_contents.slug`.
- `summary`: Máximo 160 caracteres. Se usa en meta description y en cards.
- `lang`: `es` o `en`.

### Artefacto admin complementario

Además de los dos archivos `.md`, cada propuesta de artículo debe traer un artefacto complementario para cargar datos en el panel admin. Los tres archivos se guardan juntos bajo `articles/{slug_uk}/`:

```text
articles/what-is-an-example/
├── es.md
├── en.md
└── admin.md
```

El archivo `admin.md` debe usar esta estructura:

```yaml
metadata:
  slug_uk: what-is-an-example
  type: concept
  category: fundamentals
  volatility: low
  featured: false
  applicable_as_of: null
relations_suggested:
  related:
    - what-is-an-llm
  prerequisite: []
  next: []
resources_suggested:
  - title: Example official docs
    type: doc
    url: https://example.com
    description: Short reason this resource is useful.
image_suggestions: []
```

Para tutoriales, el admin.md incluye `difficulty` y `estimated_time`:

```yaml
metadata:
  slug_uk: mcp-in-claude-code
  type: tutorial
  category: tools
  volatility: high
  featured: false
  applicable_as_of: julio 2026
  difficulty: intermediate
  estimated_time: "30 min"
```

---

## 9. Checklist antes de publicar

Antes de cambiar el estado de un artículo a `published`, verificar:

- [ ] Las secciones obligatorias del Markdown existen y tienen contenido real
- [ ] El `summary` tiene menos de 160 caracteres
- [ ] El `slug` en cada idioma es correcto y único
- [ ] La `volatility` está asignada según los criterios de la sección 3
- [ ] Al menos 2 recursos externos están propuestos o vinculados desde el panel admin
- [ ] Las relaciones sugeridas están definidas fuera del Markdown
- [ ] Si es tutorial, `difficulty` y `estimated_time` están informados
- [ ] Si es tutorial, tiene secciones Objetivo, Prerrequisitos, Pasos, Resultado esperado
- [ ] El código compila / es funcional (si aplica)
- [ ] No hay links rotos a otros artículos
- [ ] Revisión ortográfica básica en ambos idiomas

---

## 10. Lo que NO es un artículo del Hub

- Una review o comparativa de productos con scoring
- Una opinión o predicción sin sustento técnico
- Un artículo de noticias o changelog
- Contenido que no sea relevante para developers y builders

Los **tutorials paso a paso SÍ son parte del Hub**. Son guías técnicas concisas, con un resultado específico y verificable. No son cursos multi-módulo ni reemplazan documentación oficial de herramientas. La extensión del tutorial la define el `estimated_time` declarado por el autor, no un tope fijo de palabras.

---

> Este documento se actualiza cuando cambia la estructura canónica, las categorías disponibles o los criterios editoriales.
> Cualquier agente que genere artículos debe consultar la versión más reciente antes de ejecutar.
