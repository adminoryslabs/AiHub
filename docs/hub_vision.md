# AI Hub — Vision Document

> Este documento captura la visión completa del hub, independientemente del alcance del MVP.
> Sirve como referencia para decisiones de diseño, producto y arquitectura.
> Idioma del documento: español neutral.

---

## 1. Qué es el Hub

El Hub es un **espacio de conocimiento comunitario sobre IA generativa**, estructurado y mantenido editorialmente, con asistencia de agentes IA.

No es un blog. No es un directorio de herramientas. No es una plataforma de cursos.

Es una **referencia práctica viva** — enciclopédica en estructura, práctica en contenido — pensada para desarrolladores y builders que quieren entender y usar conceptos de IA generativa, independientemente de la herramienta con la que trabajen.

El Hub tiene vida propia. Es un producto con identidad independiente. Su conexión con talleres, cursos u otras iniciativas es discreta y no invasiva (como máximo, un enlace contextual).

---

## 2. Idiomas

El Hub es **bilingüe desde su nacimiento**: español neutral e inglés.

Todo artículo existe en ambos idiomas. No hay contenido de primera o segunda clase según idioma — ambas versiones son ciudadanas de igual rango.

### Implicaciones para el modelo de datos

- Cada artículo tiene dos entidades de contenido: una por idioma (`es`, `en`)
- Los campos de contenido (título, resumen, cuerpo, secciones) son independientes por idioma
- Los metadatos estructurales (estado, volatilidad, fechas, relaciones entre conceptos) son compartidos entre versiones
- `last_verified_at` y `last_edited_at` se registran por idioma de forma independiente — una versión puede estar actualizada mientras la otra está pendiente de revisión

### Implicaciones para el flujo editorial

- Una publicación requiere que ambas versiones estén aprobadas, o que se publiquen de forma independiente con un estado visible que indique cuál está pendiente
- El score de obsolescencia se calcula por idioma de forma separada
- Las traducciones pueden ser responsabilidad de un editor distinto al autor original

---

## 3. Público objetivo

- Desarrolladores que quieren incorporar IA generativa a su trabajo
- Builders y product developers construyendo sistemas con LLMs
- Profesionales técnicos que buscan entender conceptos, no solo usarlos

Nivel de entrada: alguien que ya programa, pero que no necesariamente conoce el ecosistema de IA generativa.

---

## 4. Propuesta de valor

- "Entiende cómo funcionan los sistemas de IA, no solo qué son"
- "Conceptos explicados de forma práctica, con ejemplos en las herramientas que ya usas"
- "Todo lo que está disperso en internet, estructurado y conectado"

---

## 5. Modelo de contenido

### 5.1 Estructura en árbol

Los conceptos que tienen implementaciones específicas por herramienta se organizan en árbol:

```
Skills (artículo principal — concepto)
├── Skills en Claude Code
├── Skills en OpenCode
├── Skills en Cursor
└── Skills en [herramienta N]
```

El artículo principal cubre el concepto de forma tool-agnostic: qué es, modelo mental, cuándo usarlo, patrones generales.
Las ramas cubren la implementación concreta en cada herramienta, incluyendo ejemplos de código y referencias a la documentación oficial.

No todos los conceptos tienen ramas. Un artículo sobre "qué es un LLM" no las necesita. Un artículo sobre "MCP" sí.

### 5.2 Anatomía de un artículo principal

| Sección | Propósito |
|--------|-----------|
| Qué es | Definición clara, sin jerga innecesaria |
| Modelo mental | La intuición detrás del concepto. Cómo pensarlo. |
| Cómo se usa | Práctico, con ejemplos concretos |
| Implementaciones por herramienta | Links a las ramas tool-specific |
| Cuándo usarlo / cuándo no | Criterio de decisión |
| Conceptos relacionados | Navegación contextual |
| Recursos externos | Documentación, videos, cursos, artículos curados |
| Historia y evolución | Colapsable. Para quien quiera profundidad histórica. |

### 5.3 Anatomía de una rama tool-specific

| Sección | Propósito |
|--------|-----------|
| Contexto | Cómo esta herramienta implementa el concepto padre |
| Configuración / setup | Pasos concretos para empezar |
| Ejemplos | Código real y casos de uso |
| Particularidades | Diferencias o limitaciones respecto a otras herramientas |
| Recursos oficiales | Link a docs, changelog, guías de la herramienta |
| Aplica para | Versión o estado de la herramienta al que aplica este artículo |

### 5.4 Categorías de navegación

| Categoría | Contenido |
|-----------|-----------|
| **Fundamentos** | Qué es un LLM, IA generativa, tokens, embeddings, contexto |
| **Agentes** | Agentes, tipos, memoria, tool use, ReAct, sub-agentes, skills, rules |
| **Prompting** | Diseño de prompts, técnicas, patrones de instrucción |
| **Patrones** | RAG, workflows, arquitecturas de sistema |
| **Herramientas** | Directorio de herramientas con ramas tool-specific |

Skills y Rules/Guardrails viven como artículos dentro de Agentes. Sus implementaciones por herramienta son ramas tool-specific bajo Herramientas.

Los dominios (ej. `programming`, `marketing`, `video`) funcionan como etiquetas transversales a las categorías. En el MVP existe un único dominio. El filtro de dominio aparece en la navegación cuando se sumen más dominios.

### 5.5 Tone of voice

Directo, práctico, no académico. Sin exceso de formalidad.

En lugar de: "Un agente es una entidad autónoma que..."
Se usa: "Un agente es básicamente un LLM con permiso para tomar acciones."

---

## 6. Modelo comunitario

### 6.1 Roles

| Rol | Permisos | Acceso |
|-----|----------|--------|
| Lector | Leer, flaggear artículos como desactualizados, dar feedback | Público |
| Editor | Crear y editar artículos, proponer cambios | Por invitación / aprobación manual |
| Revisor | Aprobar o rechazar cambios propuestos por otros editores | Por invitación / aprobación manual |
| Admin | Control total: gestión de roles, dashboard editorial, configuración de agentes | Solo fundadores |

El acceso de editores y revisores es controlado. Se aprueba de forma manual en las etapas iniciales. La apertura progresiva a más colaboradores es parte de la hoja de ruta, pero siempre con revisión humana.

### 6.2 Flujo de contribución humana

```
Editor crea/modifica artículo (borrador)
    → Revisor revisa y aprueba / solicita cambios / rechaza
        → Si aprobado: pasa a Publicado
        → Si rechazado: vuelve a Borrador con comentarios
```

Un editor no puede publicar su propio artículo sin aprobación de un revisor.
**Excepción: el admin puede publicar artículos propios directamente.**

### 6.3 Flujo de contribución asistida por IA (visión futura)

```
Agente IA propone creación / modificación / deprecación
    → Editor o Revisor humano revisa, ajusta y aprueba o rechaza
        → Si aprobado: se publica o actualiza
        → Si rechazado: se descarta con log
```

El agente nunca publica directamente. Siempre hay un humano en el ciclo de aprobación.

---

## 7. Modelo operativo inicial

En la fase inicial, el sistema de agentes en background descrito en la sección 6.3 no existe. El flujo editorial es manual y operado por el admin.

El flujo de creación de contenido en esta fase se apoya en skills invocados manualmente:

```
Skill de investigación (busca info sobre el tema, genera resumen y lista de fuentes)
    → Skill de redacción (genera el artículo en base a la investigación)
        → Skill de revisión (verifica estructura, tono, precisión)
            → Revisión humana final y publicación por el admin
```

Este modelo escala hasta que el volumen de contenido o el número de editores justifique automatizar el ciclo. La arquitectura del sistema debe estar preparada para ese momento desde el inicio, aunque no lo active en el MVP.

---

## 8. Ciclo de vida de un artículo

### 8.1 Estados

```
Borrador → En revisión → Publicado → Flagged → Deprecado
```

| Estado | Descripción |
|--------|-------------|
| Borrador | En creación por un editor. No visible al público. |
| En revisión | Enviado para aprobación. Bloqueado para edición. |
| Publicado | Visible al público. Puede ser editado por editores autorizados. |
| Flagged | Marcado como potencialmente desactualizado. Visible pero con aviso al lector. |
| Deprecado | Contenido obsoleto o reemplazado. Redirige al artículo sucesor si aplica. |

### 8.2 Verificado vs Editado

Un artículo puede ser **verificado como vigente** sin ser editado. Esta acción registra `last_verified_at` y reinicia su score de obsolescencia, sin crear una nueva versión del contenido.

Esto permite que el sistema distinga entre "nadie lo ha tocado en 6 meses" y "fue revisado hace 2 semanas y sigue correcto".

---

## 9. Sistema de obsolescencia

### 9.1 Índice de obsolescencia

Cada artículo tiene un score calculado que determina su prioridad en la cola de revisión. El score sube cuando el artículo envejece sin revisión y baja al ser verificado o actualizado.

Factores que componen el score:

| Factor | Descripción |
|--------|-------------|
| Tiempo sin revisión | Días desde `last_verified_at` o `last_edited_at` |
| Volatilidad del artículo | Configurable: Baja / Media / Alta |
| Flags de la comunidad | Cada flag de "desactualizado" sube el score |
| Señales externas (futuro) | Releases de herramientas asociadas detectados via feed |

### 9.2 Volatilidad

- **Default por categoría**: las ramas tool-specific heredan volatilidad Alta. Los conceptos fundamentales heredan Baja.
- **Override por artículo**: un editor o admin puede ajustar la volatilidad de un artículo específico si su comportamiento real difiere del default de su categoría.

### 9.3 Aplicabilidad (para ramas tool-specific)

Cada rama tiene un campo `applicable_as_of`: la versión o fecha del estado de la herramienta contra el que fue escrito/validado el artículo. Permite detectar drift cuando la herramienta avanza.

---

## 10. Dashboard editorial

El admin y los revisores tienen acceso a un dashboard con:

- **Cola de revisión priorizada** por score de obsolescencia
- **Filtros**: por categoría, estado, volatilidad, herramienta, idioma, score
- **Acciones en bloque**: marcar como verificados, asignar a revisor, gatillar revisión por agente IA
- **Log de actividad**: historial de cambios, verificaciones y aprobaciones por artículo
- **Vista de árbol**: navegación de conceptos y sus ramas, con estado visual de cada nodo

El objetivo es que el admin no tenga que revisar artículo por artículo, sino gestionar la cola según prioridad y delegar en editores o en agentes IA.

---

## 11. Learning paths

Rutas curadas de artículos para objetivos específicos de aprendizaje. Ejemplo:

- "De cero a construir tu primer agente"
- "Entiende MCP en 5 artículos"
- "IA generativa para tu flujo de trabajo como desarrollador"

Las learning paths son editadas manualmente por admins o editores senior. No son generadas algorítmicamente en las etapas iniciales.

**Visión futura**: los agentes IA podrán proponer nuevas learning paths o ajustes a las existentes, siguiendo el mismo patrón de aprobación humana del resto del sistema editorial.

---

## 12. Feedback de lectores

Cada artículo incluye un mecanismo simple de feedback: "¿Te fue útil este artículo?" (sí / no).

Este feedback alimenta:
- El score de calidad del artículo (visible internamente en el dashboard)
- La prioridad de revisión (un artículo con muchos "no" sube en la cola)

Los lectores también pueden flaggear un artículo como desactualizado con un motivo opcional.

---

## 13. Ask to the article (visión futura)

Una barra de búsqueda contextual dentro de cada artículo que permite al lector hacer preguntas en lenguaje natural. Las respuestas se generan exclusivamente en base al contenido del artículo — no sobre otras fuentes del Hub ni sobre conocimiento externo.

**Consideraciones de implementación:**
- Un artículo individual entra completo en contexto, sin necesidad de RAG real. Esto simplifica la implementación.
- El costo por consulta puede controlarse usando un modelo económico (ej. Haiku).
- El riesgo principal no es el costo sino la calidad: hay que ser estricto en que el modelo solo responda con información del artículo y no genere contenido más allá de él.
- A escala alta de tráfico, el costo de API puede volverse significativo. Habrá que evaluar caching de respuestas frecuentes o límites por usuario.

Esta funcionalidad se evalúa para una fase posterior una vez que el Hub tenga tracción suficiente para justificar el costo operativo.

---

## 14. Lo que el Hub no es

- No es una plataforma de cursos ni tiene lógica de monetización interna
- No es un blog (no hay posts cronológicos, no hay autor como protagonista)
- No es un directorio de herramientas
- No es una red social

Su vínculo con el ecosistema de talleres y cursos es contextual y discreto. Un enlace en el lugar correcto, nada más.

---

## 15. Hoja de ruta de capacidades

| Capacidad | MVP | Fase siguiente | Visión completa |
|-----------|-----|----------------|-----------------|
| Artículos con estructura fija | Si | — | — |
| Árbol concepto → ramas tool-specific | Si | — | — |
| Bilingüe (ES + EN) | Si | — | — |
| Roles: solo admin | Si | + editor + revisor | + colaborador abierto |
| Ciclo de vida de artículos | Simplificado | Completo | — |
| Flujo editorial manual con skills | Si | — | Reemplazado por agentes |
| Feedback de lectores | No | Si | — |
| Score de obsolescencia | Manual básico | Semi-automático | Automático con señales externas |
| Dashboard editorial | Básico | Completo con filtros y por idioma | — |
| Agentes IA en ciclo editorial | No | Si | Autónomo con aprobación humana |
| Learning paths | No | Si (manual) | + propuestas por agentes IA |
| Ask to the article | No | No | Si, con control de costos |
| Contribuciones abiertas | No | No | Si, con moderación |
