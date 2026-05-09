# Exploration — recursos-por-idioma

## Estado actual

- `resources` guarda metadatos globales del recurso: `title`, `type`, `url`, `description`.
- `article_resources` solo vincula `article_id` con `resource_id`.
- El idioma hoy vive en `article_contents`, no en recursos ni en sus vínculos.
- Admin y sitio público consumen un único array `resources[]` por artículo.

## Archivos revisados

- `packages/api/migrations/001_initial_schema.sql`
- `packages/api/src/routes/admin/resources.ts`
- `packages/api/src/routes/admin/articles.ts`
- `packages/api/src/routes/public/articles.ts`
- `packages/shared/src/types/article.ts`
- `packages/web/app/(admin)/admin/articles/[id]/page.tsx`
- `packages/web/app/(admin)/admin/resources/page.tsx`
- `packages/web/components/layout/SidebarRight.tsx`

## Opciones evaluadas

### Opción A — agregar `lang` a `resources`

Pros:
- Modelo fácil de leer.

Contras:
- Duplica recursos para ES y EN aunque sean el mismo link.
- Mezcla el idioma del recurso con el catálogo global.
- Hace más costoso mantener la biblioteca compartida.

### Opción B — agregar `lang` a `article_resources`

Pros:
- Es el cambio más corto.
- Mantiene `resources` como biblioteca global reutilizable.
- El idioma queda donde realmente hace falta: en el vínculo artículo-recurso.

Contras:
- Si en el futuro hiciera falta traducir título, descripción o URL por idioma, eso requerirá una evolución adicional.

### Opción C — crear traducciones de recursos

Pros:
- Modelo más limpio para largo plazo.

Contras:
- Es más costoso en schema, API, UI y migración.
- No cumple la regla de camino más corto para esta iteración.

## Decisión recomendada

Elegir la opción B: agregar `lang` a `article_resources`.

## Migración sugerida

- Agregar columna `lang` con valores `es | en`.
- Backfill de vínculos actuales replicándolos a ambos idiomas.

Razón del backfill:
- No existe información histórica para inferir si un recurso actual era solo ES, solo EN o ambos.
- Duplicar a ambos idiomas preserva comportamiento y evita pérdida de datos.

## Impacto esperado

- Cambio de schema acotado.
- Ajustes en queries admin y públicas.
- Cambio de contrato admin para exponer recursos por idioma.
- Cambio de UI en la pestaña de recursos del artículo.
- Sin cambios estructurales en la biblioteca global `/admin/resources`.
