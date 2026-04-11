# Lineamientos de creación de artículos — AI Hub

> Este documento es la fuente de verdad para cualquier agente o editor que cree contenido en AI Hub.
> Antes de redactar un artículo, leer este documento completo.
> Versión: 1.0 | Última revisión: 2026-04-11

---

## 1. Tipos de artículo

### 1.1 Concepto (`type: concept`)

Cubre un concepto de IA generativa de forma **tool-agnostic**. No depende de ninguna herramienta específica.

Ejemplos: *Qué es un LLM*, *Qué es RAG*, *Qué es un agente*, *Qué es el contexto*.

### 1.2 Rama tool-specific (`type: tool-branch`)

Cubre cómo **una herramienta concreta** implementa el concepto padre. Siempre está vinculada a un artículo concepto mediante `parent_id`.

Ejemplos: *RAG en LangChain*, *Agentes en Claude Code*, *MCP en Cursor*.

---

## 2. Estructura canónica

### 2.1 Artículo concepto

Las secciones deben aparecer en este orden. No omitir ninguna salvo que se indique explícitamente que no aplica.

| # | Sección | Obligatoria | Notas |
|---|---------|-------------|-------|
| 1 | **Qué es** | Sí | Definición directa. Máximo 3 párrafos. Sin jerga innecesaria. |
| 2 | **Modelo mental** | Sí | La intuición detrás del concepto. Una analogía, diagrama Mermaid o comparativa. |
| 3 | **Cómo se usa** | Sí | Práctico. Con ejemplos de código cuando aplique. |
| 4 | **Implementaciones por herramienta** | Solo si existen ramas | Lista de links a las ramas tool-specific del artículo. |
| 5 | **Cuándo usarlo / cuándo no** | Sí | Dos columnas o dos listas. Criterio de decisión real, no marketing. |
| 6 | **Conceptos relacionados** | Sí | Links a otros artículos del Hub. Mínimo 2, máximo 6. |
| 7 | **Recursos externos** | Sí | Curados. Mínimo 2. Ver sección 5 para criterios. |
| 8 | **Historia y evolución** | No | Colapsable (`<details>`). Solo si aporta contexto relevante. |

### 2.2 Rama tool-specific

| # | Sección | Obligatoria | Notas |
|---|---------|-------------|-------|
| 1 | **Contexto** | Sí | Cómo esta herramienta implementa el concepto padre. 1-2 párrafos. |
| 2 | **Configuración / setup** | Sí | Pasos concretos. Comandos reales. Versión de la herramienta indicada. |
| 3 | **Ejemplos** | Sí | Código real y funcional. Casos de uso representativos. |
| 4 | **Particularidades** | Sí | Diferencias, limitaciones o ventajas respecto a otras herramientas. |

---

## 3. Metadatos

Cada artículo tiene metadatos estructurales que deben definirse antes de redactar el contenido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `slug_uk` | string | Slug canónico en inglés. Ej: `what-is-an-llm`. Solo minúsculas y guiones. |
| `type` | enum | `concept` o `tool-branch` |
| `parent_id` | uuid \| null | Requerido si `type = tool-branch`. Null para conceptos. |
| `category` | string | Ver sección 4. |
| `volatility` | enum | `low` / `medium` / `high`. Ver criterios abajo. |
| `featured` | boolean | Solo marcar si el artículo es adecuado para la homepage. Ser selectivo. |
| `applicable_as_of` | string \| null | Solo para `tool-branch`. Versión o fecha del estado de la herramienta. Ej: `v2.1`, `abril 2026`. |

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
| `tools` | Herramientas | Tools | Ramas tool-specific de frameworks y modelos concretos |

Regla: las ramas tool-specific van en `tools`, no en la categoría del concepto padre.

---

## 5. Recursos externos

Cada artículo debe incluir recursos curados en el campo `resources` de la base de datos (no inline en el markdown). El cuerpo del artículo no incluye links de recursos — todos van a la sección de recursos.

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

## Conceptos relacionados

...

## Recursos externos

> Los recursos se gestionan desde el panel admin, no en el markdown.

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

---

## 9. Checklist antes de publicar

Antes de cambiar el estado de un artículo a `published`, verificar:

- [ ] Las 7 secciones obligatorias existen y tienen contenido real
- [ ] El `summary` tiene menos de 160 caracteres
- [ ] El `slug` en cada idioma es correcto y único
- [ ] La `volatility` está asignada según los criterios de la sección 3
- [ ] Al menos 2 recursos externos vinculados
- [ ] Si es `tool-branch`, `applicable_as_of` está informado
- [ ] El código compila / es funcional (si aplica)
- [ ] No hay links rotos a otros artículos
- [ ] Revisión ortográfica básica en ambos idiomas

---

## 10. Lo que NO es un artículo del Hub

- Un tutorial paso a paso de principio a fin (eso es un curso)
- Una review o comparativa de productos con scoring
- Una opinión o predicción sin sustento técnico
- Un artículo de noticias o changelog
- Contenido que no sea relevante para developers y builders

---

> Este documento se actualiza cuando cambia la estructura canónica, las categorías disponibles o los criterios editoriales.
> Cualquier agente que genere artículos debe consultar la versión más reciente antes de ejecutar.
