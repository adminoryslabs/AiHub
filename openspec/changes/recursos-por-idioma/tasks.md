# Tasks — recursos-por-idioma

## 1. Fundación compartida

- [x] Crear migración para agregar `lang` a `article_resources`
- [x] Backfillear vínculos actuales a `es` y `en`
- [x] Actualizar unique constraint e índices del vínculo
- [x] Actualizar tipos compartidos de `AdminArticle`
- [x] Ajustar tests backend afectados por el nuevo contrato

## 2. Módulo: Sitio público

- [x] Filtrar recursos por idioma en `packages/api/src/routes/public/articles.ts`
- [x] Verificar render público con recursos distintos en ES y EN
- [x] Localizar encabezado de recursos si se decide incluir esa mejora

## 3. Módulo: Panel de admin

- [x] Actualizar GET admin de artículo para devolver recursos agrupados por idioma
- [x] Actualizar endpoint de vinculación para requerir `lang`
- [x] Actualizar endpoint de desvinculación para recibir `lang`
- [x] Adaptar pestaña de recursos del artículo con selector `ES | EN`
- [x] Mantener `/admin/resources` como biblioteca global sin rediseño estructural

## 4. Verificación

- [x] Validar migración en base local o test DB
- [x] Probar vínculo y desvínculo por idioma desde admin
- [x] Probar que `/es/...` y `/en/...` devuelven recursos distintos cuando corresponde
- [x] Confirmar que artículos existentes conservan recursos visibles tras el backfill
