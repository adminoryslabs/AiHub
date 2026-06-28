---
name: aihub-article-reviewer
description: Revisa en profundidad un artículo de AI Hub (contenido, estructura, metadatos, referencias) contra los lineamientos editoriales, da un puntaje, propone correcciones y, tras aprobación del usuario, las aplica vía el MCP de AI Hub. Use when the user asks to review, score, critique, or improve an existing AI Hub article — especially articles in `in_review` status.
---

# AI Hub Article Reviewer

## Objetivo

Revisar un artículo existente del AI Hub **en su totalidad** contra `docs/article-guidelines.md`,
entregar un **informe con puntaje accionable**, proponer correcciones/mejoras/actualizaciones, y
—**solo tras la aprobación explícita del usuario**— aplicar los cambios vía el MCP de AI Hub.

El usuario es un editor senior. El artículo suele venir de un autor con menos experiencia, así que el
informe debe servir además como **feedback formativo**: específico, justificado y sin condescendencia.

## Contexto obligatorio

Antes de evaluar, leer SIEMPRE:

- `docs/article-guidelines.md` — la fuente de verdad. La rúbrica de abajo se ancla a este documento.
- El artículo objetivo completo, obtenido vía el MCP (no asumir su contenido de memoria).

## Herramientas (MCP de AI Hub)

La skill opera contra la API remota usando las herramientas `mcp__aihub__*`:

- `list_articles` — para localizar el artículo (p. ej. `status: in_review`).
- `read_article` — para obtener metadatos, contenido ES + EN, relaciones y recursos.
- `patch_article_content` — **preferida para correcciones de texto** (typos, reformular una frase):
  hace find & replace exacto, no reescribe el resto del artículo ni el código. Usar siempre que el
  cambio sea de fragmentos puntuales.
- `update_article_content` — reemplazo de un campo completo (slug/title/summary, o un body nuevo
  entero). Mezcla por campo, pero el `body` se reemplaza completo: úsalo solo para reescrituras
  grandes, no para retoques.
- `update_article_metadata` — corregir `category`, `volatility`, `domains`, `applicable_as_of`.
- `verify_article` — marcar un idioma como verificado tras la revisión.
- `set_article_status` — avanzar el estado (p. ej. `in_review → published`) si el usuario lo pide.
- `add_relation` / `remove_relation` — gestionar relaciones (`related`/`prerequisite`/`next`).
- `add_resource` — crear un recurso externo y vincularlo al artículo en un idioma (un solo paso).
- `remove_resource` — desvincular un recurso del artículo en un idioma.

Si las herramientas `mcp__aihub__*` no están disponibles en la sesión, avisar al usuario que debe
conectar el MCP de AI Hub antes de continuar. No inventar el contenido del artículo.

## Flujo

1. **Identificar el artículo.**
   - Si el usuario da un `id` o `slug`, úsalo.
   - Si dice "los que están en revisión" o similar, llama `list_articles` con `status: in_review` y
     muestra la lista para que elija. Si hay solo uno, propón revisar ese.
2. **Leer** el artículo con `read_article` (siempre ambos idiomas).
3. **Evaluar** contra la rúbrica (abajo). Para la dimensión de referencias, valida que los enlaces
   sean vigentes y de fuente reconocida; usa búsqueda web para detectar enlaces rotos, desactualizados
   o para sugerir mejores fuentes cuando aplique.
4. **Verificar afirmaciones técnicas y código.** Si hay código, razona si es funcional y actual. Marca
   errores conceptuales o ejemplos obsoletos (modelos, APIs, precios que cambiaron).
5. **Producir el informe** (formato abajo): puntaje por dimensión + total + banda, y una lista
   numerada de hallazgos accionables. Si el artículo está impecable, dilo claramente — no inventes
   problemas para justificar cambios.
6. **Esperar aprobación.** Presenta los cambios propuestos y pregunta cuáles aplicar. NO apliques nada
   sin un "sí" explícito. El usuario puede aceptar todos, algunos, o ninguno.
7. **Aplicar** los cambios aprobados:
   - Texto → `patch_article_content` (find & replace exacto). Solo usar `update_article_content`
     si reescribes un body entero o cambias slug/title/summary.
   - Metadatos → `update_article_metadata`.
   - Recursos → `add_resource` / `remove_resource`. Relaciones → `add_relation` / `remove_relation`.
   - Solo si el usuario lo pide explícitamente: `verify_article` y/o `set_article_status`.
8. **Confirmar** qué se aplicó y qué quedó pendiente.

## Rúbrica de puntaje (0–100)

El puntaje total es la suma ponderada de seis dimensiones. Cada dimensión se evalúa de 0 a su peso
máximo. **Siempre reporta el desglose**, no solo el total: la dimensión más baja es el foco de mejora.

| Dimensión | Peso | Qué evaluar (referencia en guidelines) |
|---|---|---|
| **Estructura canónica** | 15 | Secciones obligatorias presentes y en orden según `type` (§2). Sin secciones de "Conceptos relacionados" ni "Recursos externos" embebidas en el body. Frontmatter válido (§8). |
| **Precisión técnica** | 25 | Exactitud conceptual. Código real y funcional con lenguaje indicado. Sin afirmaciones obsoletas (modelos/APIs/precios). Nivel técnico adecuado: no explica lo obvio, sí explica el concepto de IA (§6). |
| **Escritura y tono** | 20 | Primer párrafo define directo (sin "en este artículo..."). Voz activa. Sin marketing ("revolucionario", "el futuro de"). Sin formalidad forzada ("cabe destacar"). Claro y directo (§6). |
| **Calidad bilingüe** | 15 | ES con acentos y signos de apertura `¿` `¡`. No traducción literal: cada idioma escrito para su lector nativo. Paridad real de contenido ES/EN. Términos técnicos en inglés cuando corresponde (§7). |
| **Metadatos y SEO** | 10 | `category`, `type`, `volatility` correctos según criterios (§3, §4). `summary` ≤160 caracteres. Slugs por idioma válidos y coherentes. `applicable_as_of` informado si es `tool-branch` (§8). |
| **Referencias y relaciones** | 15 | 2–6 recursos curados, vigentes (≤3 años salvo referencia histórica), de fuente reconocida y técnicos, no marketing. Tipos correctos (`doc`/`video`/`course`/`article`). Relaciones (`related`/`prerequisite`/`next`) pertinentes (§5). |

**Bandas:**

| Rango | Significado |
|---|---|
| 90–100 | Listo para publicar. A lo sumo retoques cosméticos. |
| 75–89 | Publicable tras correcciones menores. |
| 60–74 | Necesita trabajo real antes de publicar. |
| < 60 | Reescribir secciones o el artículo. |

Reglas de puntuación:

- Sé consistente entre revisiones: el puntaje es una métrica de seguimiento para el autor. Aplica la
  misma vara cada vez.
- Penaliza según impacto en el lector, no por gusto personal. Un error técnico pesa más que una coma.
- Justifica cada deducción con un hallazgo concreto en el informe. Un puntaje sin sustento no sirve.
- No infles el puntaje por amabilidad. El valor del feedback está en su honestidad.

## Formato del informe

Presenta el informe en este orden:

```
## Revisión: <título del artículo> (<slug_uk>) — <id>
Estado: <status> · Tipo: <type> · Categoría: <category>

### Puntaje: <total>/100 — <banda>

| Dimensión | Puntaje |
|---|---|
| Estructura canónica | x/15 |
| Precisión técnica | x/25 |
| Escritura y tono | x/20 |
| Calidad bilingüe | x/15 |
| Metadatos y SEO | x/10 |
| Referencias y relaciones | x/15 |

**Foco de mejora:** <la dimensión más baja, en una frase para el autor>

### Hallazgos

Para cada hallazgo:
- **[#] <severidad: crítico | importante | menor> — <dimensión>**
  - **Dónde:** <idioma + sección, o "metadatos">
  - **Problema:** <qué está mal y por qué importa>
  - **Propuesta:** <cambio concreto; si es de texto, mostrar el reemplazo>
  - **Aplicable por:** <herramienta MCP que lo aplicaría, p. ej. update_article_content / add_resource>
```

Tras el informe, lista los cambios aplicables vía MCP y pregunta cuáles aplicar.

## Reglas

- **Operar SOLO a través de las herramientas `mcp__aihub__*`.** No leer archivos de configuración
  (p. ej. `~/.claude.json`), no extraer credenciales, no correr scripts que llamen a la API por fuera
  del MCP. La skill debe funcionar igual para cualquier persona que tenga el MCP conectado, sin acceso
  a secretos locales. Toda edición segura ya está cubierta por `patch_article_content`.
- Código y comentarios del proyecto en español (regla global del repo). Variables/funciones en inglés.
- No publicar ni cambiar estado salvo petición explícita del usuario.
- No aplicar ningún cambio sin aprobación. La aprobación de un cambio no implica la de otro.
- Al corregir contenido, preservar lo que ya está bien: pasar a `update_article_content` solo los
  campos modificados.
- Si el artículo ya cumple el estándar, decirlo sin rodeos y no proponer cambios cosméticos.
- Las referencias se validan, no se asumen: si dudas de la vigencia de un recurso, verifícalo.
