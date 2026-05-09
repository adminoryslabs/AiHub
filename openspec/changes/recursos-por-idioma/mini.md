# Mini-SDD Assessment — recursos-por-idioma

## Solicitud

Permitir que los recursos externos de un artículo se gestionen por idioma (`es` y `en`) en lugar de ser un set único compartido por todo el artículo.

## Estado actual

- La tabla `resources` es global y no tiene campo `lang`.
- La relación `article_resources` vincula recursos al artículo sin distinguir idioma.
- El admin muestra una sola pestaña de recursos para el artículo.
- La API pública devuelve un único array `resources` para cualquier idioma del artículo.

## Hallazgos de exploración

- Schema actual: `packages/api/migrations/001_initial_schema.sql`
- Tipos compartidos: `packages/shared/src/types/article.ts`
- API admin de recursos: `packages/api/src/routes/admin/resources.ts`
- API admin de artículo: `packages/api/src/routes/admin/articles.ts`
- API pública de artículo: `packages/api/src/routes/public/articles.ts`
- UI admin de artículo: `packages/web/app/(admin)/admin/articles/[id]/page.tsx`
- UI admin global de recursos: `packages/web/app/(admin)/admin/resources/page.tsx`
- Render público de recursos: `packages/web/components/layout/SidebarRight.tsx`

## Evaluación de talla

Este cambio es `M`, no `XS/S`, por estas razones:

1. Afecta la fundación compartida entre sitio público y panel admin.
2. Requiere cambio de modelo de datos y migración de base de datos.
3. Requiere actualizar contratos de API y tipos compartidos.
4. Requiere adaptar al menos dos superficies UI: admin y público.

## Riesgos principales

1. Definir si el idioma vive en `resources`, en `article_resources` o en un nuevo modelo híbrido.
2. Evitar duplicación innecesaria de recursos cuando la URL sea la misma en ambos idiomas.
3. Mantener compatibilidad con recursos ya creados durante la migración inicial.

## Recomendación

No continuar con `mini-sdd` para este cambio.

Continuar con `full SDD` empezando por la fundación compartida:

1. schema de datos para recursos por idioma
2. contratos API admin/public
3. impacto en panel admin y sitio público

## Siguiente paso sugerido

Iniciar `full SDD` para `recursos-por-idioma` con foco en:

- decidir el modelo de datos correcto
- especificar lectura/escritura por idioma
- definir migración de recursos existentes
