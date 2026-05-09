# Spec — roles-y-permisos-editoriales

## 1. Fundación compartida

### 1.1 Requisito de identidad interna

El sistema debe representar a cada usuario interno con una identidad persistente y un único rol asignado.

### 1.2 Requisito de roles

El sistema debe permitir definir roles internos configurables, incluyendo al menos `superadmin` y `editor` en la primera iteración.

### 1.3 Requisito de permisos

El sistema debe permitir asociar un conjunto acotado de permisos a cada rol.

La primera iteración debe cubrir un catálogo básico suficiente para operar el panel sin hardcodear capacidades por nombre de rol.

### 1.4 Requisito de asignación

Cada usuario interno debe tener exactamente un rol activo.

### 1.5 Requisito de autorización backend

Las rutas privadas del panel no deben autorizar solo por autenticación válida. Cada acción sensible debe validar explícitamente el permiso requerido.

### 1.6 Requisito de sesión

La sesión autenticada debe exponer la identidad del usuario interno, su rol y los permisos efectivos necesarios para que frontend y backend apliquen el mismo modelo de autorización.

### 1.7 Requisito de administración de accesos

Debe existir un permiso específico para administrar accesos internos y solo quienes lo tengan pueden gestionar usuarios, roles y permisos.

### 1.8 Requisito de roles semilla

El sistema debe iniciar con al menos estos roles semilla:

- `superadmin`
- `editor`

### 1.9 Requisito de permisos semilla

El sistema debe iniciar con un conjunto pequeño de permisos base para artículos, publicación, recursos, imágenes y gestión de accesos.

### 1.10 Requisito de transición editorial

El sistema debe incorporar el estado `in_review` como estado editorial formal para separar la edición de la publicación.

### 1.11 Requisito de estados editoriales

Los artículos deben soportar como mínimo los siguientes estados:

```ts
'draft' | 'in_review' | 'published' | 'deprecated'
```

### 1.12 Requisito de trazabilidad mínima

El diseño debe contemplar la capacidad de distinguir quién creó o modificó contenido y quién ejecutó acciones de revisión/publicación, al menos en el nivel necesario para hacer cumplir permisos y transiciones editoriales.

## 2. Módulo: Sitio público

### 2.1 Requisito de visibilidad pública

El sitio público debe seguir mostrando únicamente artículos en estado `published`.

### 2.2 Requisito de aislamiento editorial

Los artículos en estado `draft` o `in_review` no deben exponerse en endpoints ni páginas públicas.

### 2.3 Requisito de compatibilidad pública

La incorporación de roles, permisos y `in_review` no debe alterar el contrato público de lectura más allá de excluir estados no publicados.

## 3. Módulo: Panel de admin

### 3.1 Requisito de acceso al panel

El panel debe autenticar usuarios internos y adaptar las acciones visibles o disponibles según el rol y permisos efectivos de la sesión.

### 3.2 Requisito de gestión de artículos por editor

Un usuario con permisos editoriales debe poder crear artículos, editar metadatos y contenido, gestionar recursos relacionados y subir imágenes si su rol lo permite.

### 3.3 Requisito de restricción de publicación

Un usuario sin permiso `article.publish` no debe poder publicar artículos ni ejecutar transiciones equivalentes a publicación, aunque pueda autenticarse y editar contenido.

### 3.4 Requisito de envío a revisión

Un usuario con permisos editoriales debe poder mover un artículo de `draft` a `in_review` cuando haya terminado su edición y tenga permiso para revisión.

### 3.5 Requisito de decisión editorial

Un usuario con permiso de publicación debe poder tomar decisiones sobre artículos en `in_review`, incluyendo publicarlos o devolverlos a `draft`.

### 3.6 Requisito de interfaz de superadmin

Debe existir una vista privada para `superadmin` o para quien tenga `access.manage` desde la cual se pueda:

- listar usuarios internos
- ver el rol asignado a cada usuario
- cambiar el rol de un usuario
- listar roles disponibles
- ver y actualizar los permisos asignados a cada rol

### 3.7 Requisito de simplicidad operativa

La UI de administración de accesos debe limitarse a la gestión de roles y permisos existentes. No es requisito de esta iteración crear permisos nuevos desde interfaz.

### 3.8 Requisito de borrado restringido

Un usuario sin permiso `article.delete` no debe poder eliminar artículos desde el panel ni mediante llamadas directas a la API.

### 3.9 Requisito de consistencia UI/API

Si una acción está deshabilitada en la interfaz por falta de permiso, la API correspondiente también debe rechazarla de forma explícita.

## 4. Casos de aceptación

1. Un `editor` puede iniciar sesión, crear un artículo nuevo y guardar cambios de contenido, pero no puede publicarlo.
2. Un `editor` puede mover un artículo de `draft` a `in_review` si su rol conserva los permisos editoriales definidos para esa acción.
3. Un usuario con permiso `article.publish` puede tomar un artículo en `in_review` y pasarlo a `published`.
4. Un usuario sin `article.publish` recibe rechazo del backend si intenta publicar mediante una llamada directa a la API.
5. El sitio público no muestra artículos en `draft` ni `in_review`.
6. Un `superadmin` puede cambiar el rol de un usuario interno desde el panel.
7. Un `superadmin` puede quitar `article.publish` de un rol y, desde ese momento, los usuarios con ese rol dejan de poder publicar sin requerir cambios de código.
8. Un usuario sin `access.manage` no puede acceder ni operar la pantalla de administración de accesos.
