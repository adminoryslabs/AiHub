# PRD — AI Hub (v2)

> Versión alineada con `hub_vision.md`.
> El PRD original (`ai_wiki_mvp_prd.md`) queda reemplazado por este documento.
> Idioma: español neutral.

---

## 1. Visión general

AI Hub es un espacio de conocimiento comunitario sobre IA generativa. Es una referencia práctica viva — enciclopédica en estructura, práctica en contenido — para desarrolladores y builders que quieren entender y usar conceptos de IA generativa sin depender de una herramienta específica.

No es un blog. No es un directorio. No es una plataforma de cursos. Es un producto independiente con identidad propia.

Para la visión completa, incluyendo capacidades futuras, ver `hub_vision.md`.

---

## 2. Objetivos del MVP

- Publicar artículos estructurados de alta calidad sobre conceptos de IA generativa
- Soportar la estructura en árbol: artículo principal (concepto) + ramas (implementaciones por herramienta)
- Ser bilingüe desde el primer día: español neutral e inglés
- Ofrecer navegación intuitiva entre conceptos relacionados
- Curar y mostrar recursos externos de calidad por artículo
- Establecer la base técnica y editorial para escalar hacia contribuciones comunitarias
- SEO es una prioridad desde el día uno: URLs semánticas, meta tags, hreflang, sitemap. El Hub vive o muere por tráfico orgánico.

---

## 3. No-objetivos del MVP

- Contribuciones públicas abiertas
- Sistema de revisión entre pares (el admin publica directamente en esta fase)
- Agentes IA en background para generación o actualización de contenido
- Dashboard editorial avanzado
- Sistema de feedback de lectores
- Learning paths
- "Ask to the article"
- Versioning complejo de artículos

---

## 4. Público objetivo

- Desarrolladores que quieren incorporar IA generativa a su flujo de trabajo
- Builders construyendo sistemas con LLMs
- Profesionales técnicos que buscan entender conceptos, no solo usarlos

Nivel de entrada: alguien que ya programa, pero que no conoce el ecosistema de IA generativa.

---

## 5. Propuesta de valor

- "Entiende cómo funcionan los sistemas de IA, no solo qué son"
- "Conceptos explicados de forma práctica, con ejemplos en las herramientas que ya usas"
- "Todo lo que está disperso en internet, estructurado y conectado"

---

## 6. Funcionalidades del MVP

### 6.1 Artículos

Cada artículo tiene estructura fija con las siguientes secciones:

| Sección | Notas |
|--------|-------|
| Qué es | Definición directa, sin jerga |
| Modelo mental | La intuición detrás del concepto |
| Cómo se usa | Práctico, con ejemplos |
| Implementaciones por herramienta | Solo para artículos principales con ramas |
| Cuándo usarlo / cuándo no | Criterio de decisión |
| Conceptos relacionados | Links a otros artículos |
| Recursos externos | Documentación, videos, cursos, artículos curados |
| Historia y evolución | Colapsable, secundario |

Las ramas tool-specific tienen su propia estructura:

| Sección | Notas |
|--------|-------|
| Contexto | Cómo esta herramienta implementa el concepto padre |
| Configuración / setup | Pasos concretos |
| Ejemplos | Código real |
| Particularidades | Diferencias o limitaciones |
| Recursos oficiales | Docs, changelog de la herramienta |
| Aplica para | Versión o fecha de validación |

### 6.2 Estructura en árbol

El sistema soporta artículos padre e hijos. Un artículo principal puede tener N ramas tool-specific. Las ramas aparecen listadas en el artículo principal bajo "Implementaciones por herramienta".

### 6.3 Bilingüismo

Cada artículo existe en español neutral e inglés. El usuario puede cambiar de idioma desde cualquier página. Ambas versiones comparten metadatos estructurales (relaciones, categoría, estado) pero tienen contenido independiente.

En el MVP, el admin gestiona ambas versiones manualmente. El sistema indica visualmente si una versión en un idioma está pendiente de actualización respecto a la otra.

### 6.4 Ciclo de vida de artículos

Estados soportados en el MVP:

```
Borrador → Publicado → Deprecado
```

El admin puede publicar sus propios artículos directamente. Los estados Flagged y En revisión se incorporan cuando se sumen editores y revisores.

Cada artículo registra:
- `created_at`
- `last_edited_at` (por idioma)
- `last_verified_at` (por idioma) — permite marcar como vigente sin editar

### 6.5 Navegación y categorías

Categorías principales:

| Categoría | Contenido |
|-----------|-----------|
| **Fundamentos** | Qué es un LLM, IA generativa, tokens, embeddings, contexto |
| **Agentes** | Agentes, tipos, memoria, tool use, ReAct, sub-agentes, skills, rules |
| **Prompting** | Diseño de prompts, técnicas, patrones de instrucción |
| **Patrones** | RAG, workflows, arquitecturas de sistema |
| **Herramientas** | Claude Code, Cursor, MCP, OpenCode — directorio con ramas tool-specific |

Cada artículo pertenece a una categoría. Las ramas tool-specific pertenecen a la misma categoría que su artículo padre y también aparecen bajo "Herramientas".

Conceptos como Skills y Rules/Guardrails viven como artículos dentro de Agentes. Sus implementaciones concretas por herramienta son ramas tool-specific bajo Herramientas.

### 6.6 Dominios

Cada artículo puede tener uno o más dominios (`domains: string[]`). Los dominios son etiquetas que permiten filtrar el contenido por área de aplicación.

En el MVP, todos los artículos tienen el dominio `programming` por defecto. El selector de dominio no se muestra en la UI mientras exista un único dominio. Cuando se sumen nuevos dominios (ej. `marketing`, `video`, `images`), el filtro aparece en la navegación y algunos artículos cross-domain recibirán múltiples dominios sin cambios estructurales.

### 6.7 Media en artículos

El contenido visual de los artículos se maneja en tres formatos:

**Imágenes**
Las imágenes viven inline dentro del `body` del artículo (markdown), en el lugar contextualmente relevante dentro de cada sección. No hay slots fijos.

Dos modos de display controlados por el autor mediante atributos en markdown:
- `contained` (default): centrada, max-width ~700px. Para capturas de pantalla y referencias visuales.
- `full`: ocupa el ancho completo de la columna de contenido. Para diagramas complejos donde el detalle importa.

```markdown
![descripción](url)          ← contained por defecto
![descripción](url){.full}   ← full-width
*Texto en cursiva debajo actúa como caption.*
```

Las imágenes se alojan en un bucket de storage (S3 o similar) y el admin las sube desde el panel. No hay float izquierda/derecha en el MVP.

**Diagramas**
Mermaid renderizado inline. El código del diagrama vive directamente en el `body` del artículo como bloque de código con sintaxis `mermaid`. No hay archivos de imagen externos — el diagrama es texto puro, se versiona junto al artículo.

Uso típico: diagramas de flujo de agentes, arquitecturas de sistema, relaciones entre conceptos.

**Videos**
No se autoprocesa video ni se hacen embeds inline en el MVP. Los videos van exclusivamente en la sección de **Recursos externos** del artículo (tipo: `video`), como referencias curadas a contenido en YouTube o Vimeo. Esta restricción mantiene el artículo texto-primero y simplifica el renderer.

---

### 6.8 Recursos externos

Cada artículo tiene una sección de recursos curados. Cada recurso incluye:

- Título
- Tipo (documentación / video / curso / artículo)
- URL
- Descripción breve

Los recursos no duplican contenido — son referencias, no contenido propio.

### 6.9 Búsqueda

La búsqueda es una funcionalidad crítica del Hub. El objetivo es que el usuario encuentre el artículo correcto aunque use términos distintos a los del título — por ejemplo, "local models" debe llevar a artículos sobre Ollama, Gemma o el concepto de modelos locales.

**Motor: Meilisearch** (alternativa gestionada: Algolia)

Comportamiento en el MVP:
- Búsqueda full-text con tolerancia a errores tipográficos
- Ponderación por campo: título > resumen > cuerpo del artículo
- Diccionario de sinónimos configurable (ej. "local models" = "modelos locales" = "Ollama")
- Busca en ambos idiomas simultáneamente, con badge de idioma en los resultados
- Resultados muestran: título, snippet del resumen, categoría, idioma

Lo que queda preparado para Fase 2:
- Ranking semántico por embeddings vectoriales como capa adicional sobre Meilisearch, sin cambiar la arquitectura base

### 6.10 Estructura de URLs

Formato: `/{lang}/{category}/{slug}`

Ejemplos:
- `/es/agentes/que-es-un-agente`
- `/en/agents/what-is-an-agent`
- `/es/herramientas/mcp-protocol`
- `/en/tools/mcp-protocol`

El `slug` del artículo es único por idioma y vive en `ArticleContent`. El slug en inglés es el canónico para referencias internas. Las URLs con idioma en la ruta son obligatorias para SEO (hreflang entre versiones, indexación separada por idioma).

Las categorías tienen su slug traducido en la URL:

| Categoría | ES | EN |
|-----------|----|----|
| Fundamentos | `/es/fundamentos/` | `/en/fundamentals/` |
| Agentes | `/es/agentes/` | `/en/agents/` |
| Prompting | `/es/prompting/` | `/en/prompting/` |
| Patrones | `/es/patrones/` | `/en/patterns/` |
| Herramientas | `/es/herramientas/` | `/en/tools/` |

### 6.11 Panel de administración

El admin gestiona el Hub desde un panel privado. No incluye un editor de texto enriquecido — los artículos se escriben externamente (Obsidian, VS Code, cualquier editor markdown) y se importan como archivos `.md`.

Funcionalidades del panel en el MVP:

**Gestión de artículos**
- Lista de artículos con estado, categoría e indicador de completitud por idioma
- Importar artículo: subir archivo `.md` y asignar metadatos (categoría, tipo, artículo padre si es rama, dominio, volatilidad)
- Actualizar versión de un idioma: reimportar el `.md` para ES o EN de forma independiente
- Cambiar estado: Borrador → Publicado → Deprecado
- Marcar como verificado (actualiza `last_verified_at` sin crear nueva versión)
- Editar metadatos: categoría, volatilidad, `applicable_as_of`, dominios

**Gestión de recursos externos**
- Agregar, editar y eliminar recursos vinculados a un artículo
- Campos: título, tipo, URL, descripción breve

**Gestión de imágenes**
- Subir imagen al bucket de storage
- Obtener URL para pegar en el markdown del artículo

**Autenticación**
El panel de admin es accesible mediante login con email y contraseña. En el MVP existe un único usuario admin. No hay registro público ni recuperación de contraseña en esta fase — el acceso se gestiona directamente a nivel de base de datos si es necesario.

### 6.12 Homepage

- Mensaje de posicionamiento claro
- Accesos rápidos a las 5 categorías
- Artículos destacados (selección manual por el admin)
- Selector de idioma ES / EN

---

## 7. Modelo de datos (alto nivel)

### Article
```
id
slug              -- slug canónico en inglés, usado para referencias internas
type              -- "concept" | "tool-branch"
parent_id         -- null si es concepto principal
category          -- "fundamentals" | "agents" | "prompting" | "patterns" | "tools"
domains           -- string[] ej. ["programming"]
status            -- "draft" | "published" | "deprecated"
featured          -- boolean, selección manual del admin para la homepage
volatility        -- "low" | "medium" | "high"
applicable_as_of  -- solo para ramas tool-specific (versión o fecha)
created_at
```

### ArticleContent (por idioma)
```
id
article_id
lang              -- "es" | "en"
slug              -- slug en el idioma correspondiente, usado en la URL
title
summary
body              -- markdown
last_edited_at
last_verified_at
```

### ArticleRelation
```
from_article_id
to_article_id
type              -- "related" | "prerequisite" | "next"
```

### Resource
```
id
title
type              -- "doc" | "video" | "course" | "article"
url
description
```

### ArticleResource
```
article_id
resource_id
```

---

## 8. UI/UX

### 8.1 Principios

- Limpio, minimal, sin distracciones
- Sin secciones de marketing
- Rápido para escanear
- Estructura de herramienta de conocimiento, no de blog

### 8.2 Layout

**Global:**
- Barra de navegación superior: logo, búsqueda, selector de idioma, toggle de tema
- Sidebar izquierda: categorías colapsables con links a artículos
- Área de contenido principal
- Sidebar derecha: conceptos relacionados + recursos externos

**Página de artículo:**
- Título
- Resumen corto
- Secciones del artículo con jerarquía tipográfica clara
- Bloques de código estilizados
- Sección de historia/evolución colapsable al final

**Homepage:**
- Hero simple (sin lenguaje de marketing)
- Cards de categorías
- Artículos destacados

### 8.3 Estilo visual

- Paleta neutra (blancos, grises suaves, accent sutil)
- Tipografía sans-serif con jerarquía fuerte
- Light mode por defecto, dark mode disponible
- Sin animaciones pesadas, transiciones suaves

---

## 9. Estrategia de contenido

### Tono
- Directo, práctico, no académico
- Sin exceso de formalidad

### Proceso editorial inicial (MVP)
El admin opera el flujo de contenido manualmente apoyándose en skills:

1. **Skill de investigación**: busca información sobre el tema, genera un resumen y lista de fuentes
2. **Skill de redacción**: genera el artículo en base a la investigación
3. **Skill de revisión**: verifica estructura, tono y precisión técnica
4. **Revisión y publicación manual** por el admin

Este proceso escala hacia un modelo con agentes en background en fases posteriores.

### Alcance inicial de contenido (~15–20 artículos)

Conceptos principales:
- Qué es un LLM
- Qué es la IA generativa
- Agentes (+ ramas: Claude Code, OpenCode, Cursor)
- Skills (+ ramas por herramienta)
- Rules / Guardrails (+ ramas por herramienta)
- RAG
- MCP (+ ramas por herramienta)
- Tool use
- Memoria en agentes
- Workflows
- Prompt design
- ReAct

---

## 10. Criterios de éxito del MVP

- El usuario entiende un concepto en menos de 5 minutos
- El usuario navega a al menos 2–3 artículos relacionados por sesión
- El usuario hace clic en al menos un recurso externo
- El Hub tiene contenido en ambos idiomas para todos los artículos publicados

---

## 11. Diferenciadores

AI Hub no es:
- Un blog
- Un directorio de herramientas
- Una plataforma atada a una herramienta específica

AI Hub es:
> Una referencia práctica, estructurada y bilingüe sobre cómo construir con IA generativa, con profundidad por herramienta cuando es necesario.

---

## 12. Fases futuras (fuera del MVP)

Ver `hub_vision.md` para la descripción completa. Resumen:

- Sistema de roles: editor, revisor, colaborador abierto
- Dashboard editorial con cola de revisión priorizada
- Score de obsolescencia automático
- Agentes IA en el ciclo editorial
- Feedback de lectores
- Learning paths (manual primero, luego propuestas por agentes)
- "Ask to the article" con control de costos
- Contribuciones abiertas con moderación
