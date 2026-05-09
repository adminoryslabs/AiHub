# Tasks — roles-y-permisos-editoriales

## 1. Fundación compartida

- [ ] Crear migración para introducir `roles`, `permissions`, `role_permissions` y `users`
- [ ] Seedear permisos base: `article.create`, `article.edit`, `article.review`, `article.publish`, `article.delete`, `resource.manage`, `image.upload`, `access.manage`
- [ ] Seedear roles base `superadmin` y `editor`
- [ ] Asociar permisos semilla a los roles base
- [ ] Migrar datos existentes desde `admin_users` hacia `users` asignando `superadmin`
- [ ] Eliminar o reemplazar el uso de `admin_users` en schema, seeds y runtime
- [ ] Extender `articles.status` para soportar `in_review`
- [ ] Agregar trazabilidad mínima en `articles`: `created_by`, `updated_by`, `review_requested_by`, `published_by`
- [ ] Agregar trazabilidad mínima en `article_contents`: `last_edited_by`, `last_verified_by`
- [ ] Actualizar tipos compartidos de sesión, usuario interno, rol y permiso

## 2. Backend API

- [ ] Actualizar `POST /api/v1/admin/auth/login` para autenticar contra `users` y devolver usuario, rol y permisos efectivos
- [ ] Crear `GET /api/v1/admin/session` para hidratar la sesión efectiva del panel
- [ ] Reemplazar `authenticateAdmin` por un middleware de autenticación que exponga identidad, rol y permisos
- [ ] Crear middleware `requirePermission(permissionKey)` con respuesta `403` consistente
- [ ] Reorganizar el montaje de rutas admin para no depender solo de protección por prefijo global
- [ ] Crear endpoints de administración de accesos:
- [ ] `GET /api/v1/admin/access/users`
- [ ] `PATCH /api/v1/admin/access/users/:id/role`
- [ ] `GET /api/v1/admin/access/roles`
- [ ] `PUT /api/v1/admin/access/roles/:id/permissions`

## 3. Backend editorial

- [ ] Actualizar validaciones `zod` de artículos para aceptar `in_review`
- [ ] Reemplazar la máquina de estados actual por las transiciones definidas en el diseño
- [ ] Validar permisos por transición en el endpoint de cambio de estado
- [ ] Registrar `review_requested_by` cuando un artículo pase a `in_review`
- [ ] Registrar `published_by` cuando un artículo pase a `published`
- [ ] Registrar `created_by` y `updated_by` en creación y edición estructural de artículos
- [ ] Registrar `last_edited_by` al guardar contenido por idioma
- [ ] Registrar `last_verified_by` al marcar contenido como verificado
- [ ] Proteger creación de artículos con `article.create`
- [ ] Proteger edición de metadatos, contenido y relaciones con `article.edit`
- [ ] Proteger marcado como verificado y transición a revisión con `article.review`
- [ ] Proteger publicación y transiciones post-publicación con `article.publish`
- [ ] Proteger CRUD de recursos y vínculo/desvínculo con `resource.manage`
- [ ] Proteger subida de imágenes con `image.upload`

## 4. Sitio público e indexación

- [ ] Confirmar que todos los endpoints públicos siguen devolviendo solo artículos `published`
- [ ] Verificar que `in_review` nunca aparezca en listado, detalle, featured, categorías ni sitemap
- [ ] Ajustar sincronización con Meilisearch para contemplar transiciones `in_review -> published` y `published -> draft`
- [ ] Verificar que la búsqueda pública siga filtrando exclusivamente contenido publicado

## 5. Frontend admin

- [ ] Actualizar `lib/auth.ts` y cliente admin para persistir y leer la sesión efectiva además del token
- [ ] Hidratar `GET /api/v1/admin/session` al cargar el layout del panel
- [ ] Limpiar sesión local y redirigir a login si `/admin/session` devuelve `401`
- [ ] Derivar capacidades de UI desde `permissions[]` en lugar de flags implícitos de admin
- [ ] Adaptar dashboard y navegación para ocultar secciones no permitidas
- [ ] Actualizar lista de artículos para mostrar `in_review` como estado válido
- [ ] Actualizar editor de artículo para mostrar solo acciones válidas según estado y permisos
- [ ] Reemplazar el cambio de estado simple actual por acciones explícitas: `Enviar a revisión`, `Publicar`, `Devolver a borrador`, `Deprecar`
- [ ] Asegurar que un `editor` pueda crear, editar, gestionar recursos e imágenes sin ver acciones de publicación

## 6. Pantalla de superadmin

- [ ] Crear ruta `/admin/access`
- [ ] Implementar vista `Usuarios` con listado, rol actual y cambio de rol
- [ ] Implementar vista `Roles` con listado de roles y checkboxes de permisos
- [ ] Restringir toda la pantalla `/admin/access` con `access.manage`
- [ ] Refrescar la sesión efectiva del panel tras cambios de permisos o rol cuando aplique

## 7. Seeds, scripts y compatibilidad operativa

- [ ] Actualizar script de seed inicial para crear el primer `superadmin` con el nuevo modelo
- [ ] Actualizar fixtures o utilidades de test que hoy dependan de `admin_users`
- [ ] Verificar que entornos existentes puedan levantar migraciones sin intervención manual extra

## 8. Verificación

- [ ] Probar login con usuario migrado como `superadmin`
- [ ] Probar `GET /api/v1/admin/session` con token válido e inválido
- [ ] Probar que un `editor` puede crear y editar artículos pero no publicarlos
- [ ] Probar transición `draft -> in_review` con `article.review`
- [ ] Probar rechazo `403` cuando un usuario sin `article.publish` intenta publicar por API
- [ ] Probar transición `in_review -> published` con un rol que sí tenga `article.publish`
- [ ] Probar que el sitio público no expone artículos `draft` ni `in_review`
- [ ] Probar actualización de permisos de un rol desde `/admin/access`
- [ ] Probar cambio de rol de un usuario desde `/admin/access`
- [ ] Probar que recursos e imágenes respetan permisos separados de edición/publicación
