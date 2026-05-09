# Design — roles-y-permisos-editoriales

## 1. Fundación compartida

### 1.1 Objetivo técnico

Reemplazar el modelo actual de autenticación con acceso total implícito por un modelo RBAC simple, con un solo rol por usuario, permisos configurables por rol y un flujo editorial mínimo que separe edición, revisión y publicación.

La meta no es construir un IAM completo, sino una base corta y estable que permita:

- introducir `editor` sin capacidad de publicación
- permitir a `superadmin` ajustar permisos por rol
- evitar que el nombre del rol quede hardcodeado en backend o frontend
- incorporar `in_review` sin rediseñar luego el ciclo editorial otra vez

### 1.2 Estado actual

Hoy el sistema depende de:

- tabla `admin_users`
- login que emite JWT con `userId` y `email`
- middleware `authenticateAdmin` que solo valida token
- autorización global por prefijo `/api/v1/admin/*`
- estados editoriales `draft`, `published`, `deprecated`

Ese diseño no permite diferenciar acciones por usuario interno ni separar edición de publicación.

### 1.3 Decisión de arquitectura

Se adopta un RBAC simple con estas reglas:

- cada usuario interno tiene exactamente un rol
- cada rol tiene cero o más permisos
- los permisos controlan acciones concretas
- el backend es la fuente de verdad de autorización
- el frontend consume la sesión efectiva para ocultar o deshabilitar acciones, pero nunca reemplaza la validación del backend

No se implementan en esta iteración:

- permisos directos por usuario
- múltiples roles por usuario
- herencia de roles
- reglas `deny`

### 1.4 Modelo de datos

#### 1.4.1 Reemplazo de `admin_users`

Se migra desde `admin_users` a un modelo más explícito de acceso interno.

Tabla propuesta: `users`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Identificador del usuario interno |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email de acceso |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash bcrypt |
| `role_id` | UUID | NOT NULL, FK -> `roles.id` | Rol único asignado |
| `is_active` | BOOLEAN | NOT NULL, default `true` | Permite desactivar acceso sin borrar usuario |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Fecha de actualización |

Decisión:
- se renombra conceptualmente el actor de acceso de `admin_users` a `users`, pero limitado a usuarios internos del panel
- no se introduce todavía un modelo de lectores autenticados

#### 1.4.2 Tabla `roles`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Identificador del rol |
| `slug` | VARCHAR(50) | UNIQUE, NOT NULL | Clave estable, ej. `superadmin`, `editor` |
| `name` | VARCHAR(100) | NOT NULL | Nombre de display |
| `is_system` | BOOLEAN | NOT NULL, default `true` | Indica si el rol es semilla del sistema |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Fecha de creación |

Decisión:
- `slug` es el identificador estable que puede vivir en seeds, tests y UI
- el comportamiento no depende del `slug`, salvo una regla de bootstrap inicial para asegurar que exista al menos un `superadmin`

#### 1.4.3 Tabla `permissions`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | UUID | PK, default `gen_random_uuid()` | Identificador del permiso |
| `key` | VARCHAR(100) | UNIQUE, NOT NULL | Clave estable, ej. `article.publish` |
| `description` | TEXT | NOT NULL | Descripción operativa |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Fecha de creación |

#### 1.4.4 Tabla `role_permissions`

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `role_id` | UUID | NOT NULL, FK -> `roles.id` | Rol |
| `permission_id` | UUID | NOT NULL, FK -> `permissions.id` | Permiso |

Restricción única:

```sql
UNIQUE (role_id, permission_id)
```

#### 1.4.5 Ajustes en `articles`

La tabla `articles` debe cambiar su check de `status` para soportar:

```ts
'draft' | 'in_review' | 'published' | 'deprecated'
```

Además se agregan columnas mínimas de trazabilidad estructural:

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `created_by` | UUID | NULLABLE, FK -> `users.id` | Usuario que creó el artículo |
| `updated_by` | UUID | NULLABLE, FK -> `users.id` | Último usuario que modificó metadatos estructurales |
| `review_requested_by` | UUID | NULLABLE, FK -> `users.id` | Usuario que envió a revisión |
| `published_by` | UUID | NULLABLE, FK -> `users.id` | Usuario que publicó por última vez |

Razón:
- no se implementa una bitácora completa
- sí se deja trazabilidad mínima para workflow y diagnósticos

#### 1.4.6 Ajustes en `article_contents`

Para contenido por idioma se agregan:

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `last_edited_by` | UUID | NULLABLE, FK -> `users.id` | Último editor de este idioma |
| `last_verified_by` | UUID | NULLABLE, FK -> `users.id` | Último usuario que verificó vigencia |

Razón:
- los permisos son por artículo, pero la edición real ocurre en `article_contents`
- esto mantiene consistente la trazabilidad con el modelo bilingüe

### 1.5 Permisos base

Se mantiene el catálogo pequeño acordado. Permisos semilla:

| Key | Alcance |
|-----|---------|
| `article.create` | Crear artículos |
| `article.edit` | Editar metadatos y contenidos |
| `article.review` | Enviar a revisión y devolver a borrador cuando aplique |
| `article.publish` | Publicar desde `in_review` y deprecar contenido publicado |
| `article.delete` | Eliminar artículos |
| `resource.manage` | Crear/editar/eliminar recursos y vincularlos |
| `image.upload` | Subir imágenes al bucket |
| `access.manage` | Gestionar usuarios, roles y permisos |

Decisiones:
- `article.review` cubre la transición operativa hacia y desde revisión sin abrir otro permiso más fino en esta iteración
- `resource.manage` se mantiene agregada para no partir demasiado el modelo
- `article.delete` se define desde ya aunque el código actual todavía no exponga borrado de artículo; sirve para que el diseño no quede incompleto si se agrega el endpoint en esta misma iniciativa o en una siguiente

### 1.6 Roles semilla

#### `superadmin`

Permisos iniciales:

- `article.create`
- `article.edit`
- `article.review`
- `article.publish`
- `article.delete`
- `resource.manage`
- `image.upload`
- `access.manage`

#### `editor`

Permisos iniciales:

- `article.create`
- `article.edit`
- `article.review`
- `resource.manage`
- `image.upload`

Decisión:
- no se crea `reviewer` en esta primera iteración
- si más adelante se necesita, podrá surgir como un nuevo rol compuesto por permisos existentes

### 1.7 Estrategia de migración

Migración en pasos:

1. Crear tablas `roles`, `permissions`, `role_permissions` y `users`.
2. Insertar permisos semilla.
3. Insertar roles semilla.
4. Asociar permisos a cada rol semilla.
5. Copiar filas de `admin_users` a `users` asignando el rol `superadmin` por defecto.
6. Agregar columnas nuevas en `articles` y `article_contents` con `NULL` permitido inicialmente.
7. Ampliar el check de estado de `articles` para incluir `in_review`.
8. Migrar el código de login para leer `users` en lugar de `admin_users`.
9. Una vez desplegado y verificado, remover `admin_users` o dejarla eliminada en la misma migración si no existen dependencias runtime.

Decisión recomendada:
- hacer una migración definitiva, no una convivencia larga entre `admin_users` y `users`
- el costo de coexistencia supera su beneficio en este proyecto

### 1.8 Modelo de sesión y autenticación

El login sigue usando email + contraseña y JWT, pero cambia el payload y la rehidratación de sesión.

#### Payload JWT propuesto

```ts
{
  userId: string;
  email: string;
  role: {
    id: string;
    slug: string;
  };
  permissions: string[];
}
```

Decisión:
- incluir permisos efectivos en el token simplifica frontend y middleware
- aun así, el backend debe seguir consultando la base al menos en login y en un endpoint de sesión
- no se recalculan permisos en cada request en esta iteración para mantener el diseño corto

Tradeoff aceptado:
- si un `superadmin` cambia permisos de un rol, una sesión ya emitida puede quedar desactualizada hasta el próximo login o refresh de sesión

Mitigación elegida:
- agregar endpoint de sesión actual `GET /api/v1/admin/session`
- el frontend recarga la sesión al entrar al panel y después de cambios de acceso relevantes
- se acepta este nivel de consistencia eventual en la primera versión

### 1.9 Autorización backend

Se divide la responsabilidad actual de `authenticateAdmin` en dos piezas:

#### `authenticateUser`

- valida JWT
- rechaza sesión inválida o expirada
- expone en `req.adminUser` o `req.authUser`:

```ts
{
  id: string;
  email: string;
  role: { id: string; slug: string };
  permissions: string[];
}
```

#### `requirePermission(permissionKey)`

- valida que el usuario autenticado tenga el permiso requerido
- si no lo tiene, responde `403 FORBIDDEN`

Ejemplo de uso:

```ts
router.post('/', requirePermission('article.create'), handler)
router.patch('/:id/content', requirePermission('article.edit'), handler)
router.patch('/:id/status', requirePermission('article.publish'), handler)
```

Decisión:
- el permiso se aplica por endpoint/acción
- no se deja la autorización agregada solo en `app.use('/admin/...')`

### 1.10 Transiciones editoriales

Se redefine la máquina mínima de estados:

```ts
draft -> in_review
in_review -> draft
in_review -> published
published -> draft
published -> deprecated
deprecated -> draft
```

Razón de cada transición:

- `draft -> in_review`: el editor termina su trabajo y lo envía a revisión
- `in_review -> draft`: el revisor o publicador pide cambios
- `in_review -> published`: publicación formal
- `published -> draft`: permite retirar a edición un contenido publicado para re-trabajo importante sin deprecarlo
- `published -> deprecated`: flujo ya existente de contenido obsoleto
- `deprecated -> draft`: recuperación controlada de contenido para reedición

Reglas de permisos sobre transiciones:

| Transición | Permiso requerido |
|-----------|-------------------|
| `draft -> in_review` | `article.review` |
| `in_review -> draft` | `article.review` |
| `in_review -> published` | `article.publish` |
| `published -> draft` | `article.publish` |
| `published -> deprecated` | `article.publish` |
| `deprecated -> draft` | `article.publish` |

Decisión:
- publicar y administrar el ciclo post-publicación quedan agrupados bajo `article.publish`
- esto evita introducir permisos extra como `article.deprecate` o `article.unpublish` en esta iteración

### 1.11 Contratos API

#### 1.11.1 Auth y sesión

`POST /api/v1/admin/auth/login`

Respuesta nueva:

```ts
{
  data: {
    token: string;
    expires_at: string;
    user: {
      id: string;
      email: string;
      role: {
        id: string;
        slug: string;
        name: string;
      };
      permissions: string[];
    };
  };
}
```

`GET /api/v1/admin/session`

Devuelve la sesión efectiva actual para hidratar el frontend.

#### 1.11.2 Gestión de accesos

`GET /api/v1/admin/access/users`

```ts
{
  data: Array<{
    id: string;
    email: string;
    is_active: boolean;
    role: {
      id: string;
      slug: string;
      name: string;
    };
    created_at: string;
  }>;
}
```

`PATCH /api/v1/admin/access/users/:id/role`

```ts
{
  role_id: string;
}
```

`GET /api/v1/admin/access/roles`

```ts
{
  data: Array<{
    id: string;
    slug: string;
    name: string;
    is_system: boolean;
    permissions: string[];
  }>;
}
```

`PUT /api/v1/admin/access/roles/:id/permissions`

```ts
{
  permissions: string[];
}
```

Decisión:
- no se expone creación de permisos ni creación arbitraria de roles en esta iteración
- sí se permite editar qué permisos tienen los roles existentes

#### 1.11.3 Artículos

`GET /api/v1/admin/articles`

- mantiene su contrato principal
- el filtro `status` debe aceptar `in_review`

`PATCH /api/v1/admin/articles/:id/status`

Body:

```ts
{
  status: 'draft' | 'in_review' | 'published' | 'deprecated';
}
```

Regla:
- el endpoint valida transición válida y permiso asociado a la transición

`GET /api/v1/admin/articles/:id`

- puede incluir metadata mínima adicional de trazabilidad si se considera útil para la UI
- no se vuelve obligatorio exponer un historial completo

### 1.12 Seed y bootstrap

Se deben crear seeds para:

- permisos base
- rol `superadmin`
- rol `editor`
- asignación completa de permisos a `superadmin`
- asignación editorial a `editor`

Regla operativa:
- si existe un usuario migrado desde `admin_users`, se asigna a `superadmin`
- si el proyecto arranca desde cero, el seed o script de creación inicial debe exigir que el primer usuario interno quede como `superadmin`

### 1.13 Índices y constraints

Índices recomendados:

- `users(email)` unique
- `users(role_id)`
- `roles(slug)` unique
- `permissions(key)` unique
- `role_permissions(role_id, permission_id)` unique
- `articles(status)` se mantiene, ahora con `in_review`

Constraints operativas:

- no permitir `role_id` nulo en `users`
- no permitir eliminar el último rol `superadmin` asignado si esa operación llega a existir más adelante

Nota:
- esta última regla puede resolverse a nivel de servicio/backend, no necesariamente con constraint SQL en la primera versión

## 2. Módulo: Sitio público

### 2.1 Contrato público

No cambia el contrato público base. El sitio sigue consumiendo solo contenido `published`.

Impactos:

- endpoints públicos continúan filtrando por `a.status = 'published'`
- Meilisearch sigue indexando y buscando solo contenido publicado
- sitemap, featured, categorías y detalle público no exponen `draft` ni `in_review`

### 2.2 Compatibilidad de búsqueda e indexación

La incorporación de `in_review` no requiere cambio funcional en frontend público.

Solo requiere asegurar que:

- el indexador descarte `draft`, `in_review` y `deprecated` según corresponda
- cambios de estado `in_review -> published` y `published -> draft` actualicen el índice correctamente

Decisión:
- se reutiliza la lógica ya existente de indexación por `published`
- solo se amplían las transiciones que gatillan `upsert` o `delete` en Meilisearch

## 3. Módulo: Panel de admin

### 3.1 Arquitectura de frontend

El panel debe hidratar la sesión efectiva al inicio y derivar capacidades desde `permissions: string[]`.

Estado frontend mínimo:

```ts
type AdminSession = {
  id: string;
  email: string;
  role: {
    id: string;
    slug: string;
    name: string;
  };
  permissions: string[];
};
```

Decisión:
- no se distribuyen flags manuales como `isAdmin`, `canPublish`, `canManageUsers`
- la UI deriva todo desde `permissions.includes(...)`

### 3.2 Protección de rutas del panel

La protección actual por token en `localStorage` se mantiene en esencia, pero la app debe:

- validar sesión al cargar el layout admin
- limpiar token si `GET /session` responde 401
- usar permisos de sesión para determinar navegación y acciones visibles

Tradeoff aceptado:
- no se migra todavía a cookies httpOnly en esta iniciativa
- eso puede quedar para una evolución posterior de seguridad de auth

### 3.3 UI de artículos

Cambios esperados:

- el selector o botón de cambio de estado debe contemplar `in_review`
- las acciones visibles dependen de permisos
- un editor ve acción de "Enviar a revisión"
- un usuario con `article.publish` ve acciones de publicación, devolución a borrador y deprecación

Decisión de UX:
- evitar mostrar un dropdown libre con todos los estados
- mostrar solo acciones válidas para el estado actual y los permisos del usuario

Ejemplos:

- artículo en `draft` + usuario con `article.review` => botón `Enviar a revisión`
- artículo en `in_review` + usuario con `article.publish` => botones `Publicar` y `Devolver a borrador`
- artículo en `published` + usuario con `article.publish` => botones `Pasar a borrador` y `Deprecar`

### 3.4 UI de administración de accesos

Nueva sección recomendada en el panel:

- ruta: `/admin/access`

Subvistas mínimas:

- `Usuarios`
- `Roles`

#### Vista `Usuarios`

- tabla de usuarios internos
- columnas: email, rol, estado, fecha de creación
- acción: cambiar rol mediante select

#### Vista `Roles`

- lista de roles existentes
- cada rol muestra checkboxes de permisos disponibles
- acción: guardar permisos del rol

Decisiones de simplicidad:

- no crear wizard
- no soportar creación de permisos desde UI
- no soportar roles múltiples
- no soportar clonación de roles en esta iteración

### 3.5 Backend de artículos

Los endpoints existentes deben mapearse así:

- crear artículo -> `article.create`
- actualizar metadatos -> `article.edit`
- upsert de contenido por idioma -> `article.edit`
- marcar verificado -> `article.review`
- cambiar estado -> depende de transición
- gestionar relaciones -> `article.edit`
- vincular/desvincular recursos -> `resource.manage`

Decisión específica:
- `verifyArticle` cae bajo `article.review` porque es una acción editorial de validación, no de publicación

### 3.6 Backend de recursos e imágenes

- `/admin/resources/*` requiere `resource.manage`
- `/admin/images/*` requiere `image.upload`

### 3.7 Backend de acceso

Nueva agrupación de rutas:

- `/api/v1/admin/access/users`
- `/api/v1/admin/access/roles`

Todas requieren `access.manage`.

### 3.8 Manejo de errores

Nuevos códigos esperados:

- `401 UNAUTHORIZED` para sesión inválida o ausente
- `403 FORBIDDEN` para falta de permiso
- `409 CONFLICT` para transiciones editoriales inválidas o intentos de asignar roles inexistentes cuando aplique

Mensaje recomendado:

```ts
{
  error: {
    code: 'FORBIDDEN',
    message: 'No tienes permisos para realizar esta acción'
  }
}
```

## 4. Flujo operativo mínimo

### 4.1 Editor crea y envía a revisión

1. Inicia sesión.
2. Crea artículo con `article.create`.
3. Edita contenido y metadatos con `article.edit`.
4. Gestiona recursos/imágenes según permisos.
5. Cambia estado de `draft` a `in_review` con `article.review`.

### 4.2 Superadmin publica

1. Inicia sesión.
2. Revisa artículo en `in_review`.
3. Lo devuelve a `draft` o lo publica según criterio.
4. Si publica, la API actualiza `published_by`, `updated_at` y sincroniza Meilisearch.

### 4.3 Superadmin cambia capacidades de un rol

1. Entra a `/admin/access`.
2. Abre rol `editor`.
3. Activa o desactiva permisos del rol.
4. Guarda cambios.
5. Las nuevas sesiones ya reflejan ese set de permisos.

## 5. Impacto en implementación actual

### 5.1 Backend

Archivos con impacto directo ya identificados:

- `packages/api/src/routes/admin/auth.ts`
- `packages/api/src/middleware/auth.ts`
- `packages/api/src/index.ts`
- `packages/api/src/routes/admin/articles.ts`
- `packages/api/src/routes/admin/resources.ts`
- `packages/api/src/routes/admin/images.ts`
- `packages/api/src/services/meilisearch.ts`
- `packages/api/migrations/001_initial_schema.sql`
- seeds de creación de usuario admin

### 5.2 Frontend

- `packages/web/lib/auth.ts`
- `packages/web/lib/admin-api-client.ts`
- `packages/web/app/(admin)/admin/layout.tsx`
- `packages/web/app/(admin)/admin/articles/page.tsx`
- `packages/web/app/(admin)/admin/articles/[id]/page.tsx`
- nueva pantalla `/admin/access`

## 6. Decisiones explícitas

### 6.1 Por qué un solo rol por usuario

Porque cubre el caso de negocio con menos complejidad operativa y evita tener que resolver precedencias o composición de permisos en esta fase.

### 6.2 Por qué permisos por rol y no por usuario

Porque el usuario pidió una operación simple: si una persona necesita más capacidades, se ajusta su rol. El costo de introducir overrides por usuario no se justifica todavía.

### 6.3 Por qué `in_review` ahora

Porque sin ese estado el permiso `article.publish` sería una restricción artificial sobre un flujo que no distingue entre trabajo en progreso y contenido listo para aprobación.

### 6.4 Por qué no crear `reviewer` todavía

Porque el caso actual solo exige separar edición de publicación. Un rol adicional sería estructura sin demanda inmediata.

### 6.5 Por qué mantener JWT en esta iteración

Porque el proyecto ya opera así y este cambio busca priorizar modelo de autorización y workflow. Cambiar también a cookies httpOnly mezclará dos iniciativas distintas.

## 7. Riesgos abiertos

- sesiones con permisos desactualizados hasta refresh/login
- necesidad futura de proteger que siempre exista al menos un `superadmin`
- posible necesidad posterior de separar `article.review` en permisos más finos si el workflow crece
- trazabilidad todavía insuficiente para auditoría completa, aunque suficiente para esta iteración

## 8. Resultado del diseño

El sistema queda preparado para operar con usuarios internos de distintos niveles de capacidad, con publicación separada de edición, un estado formal `in_review` y una administración simple de accesos sin convertir AI Hub en un sistema complejo de IAM.
