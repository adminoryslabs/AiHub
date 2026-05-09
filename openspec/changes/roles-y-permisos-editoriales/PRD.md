# PRD — roles-y-permisos-editoriales

## Objetivo

Introducir un sistema simple y flexible de roles y permisos para el panel interno de AI Hub, de modo que el acceso deje de depender de un único tipo de admin y pueda configurarse desde un panel de superadmin.

## Problema actual

Hoy cualquier usuario autenticado en el panel tiene acceso total a todas las acciones admin. El sistema no distingue entre capacidades editoriales, de publicación o de administración de accesos.

Esto bloquea dos necesidades inmediatas:

- incorporar usuarios `editor` que puedan crear y modificar artículos sin publicarlos
- preparar una base escalable para ajustar permisos por rol en el futuro sin rediseñar la autenticación otra vez

## Resultado esperado

- Existe un rol `superadmin` con control total sobre usuarios, roles y permisos.
- Existe al menos un rol `editor` que puede crear, editar y revisar artículos, pero no publicarlos en esta primera iteración.
- Cada usuario interno tiene un único rol asignado.
- Los permisos se configuran a nivel de rol, no por usuario individual.
- El panel interno expone una vista de superadmin para asignar roles a usuarios y ajustar los permisos básicos de cada rol.
- La API deja de autorizar por simple autenticación y pasa a validar permisos por acción.
- El flujo editorial incorpora el estado `in_review` para separar edición de publicación.

## Alcance de la primera iteración

- Reemplazar el modelo implícito de "todo o nada" por RBAC simple.
- Definir un conjunto pequeño de permisos básicos, suficiente para cubrir artículos, publicación, recursos, imágenes y gestión de accesos.
- Soportar un solo rol por usuario.
- Mantener la experiencia editorial tan simple como sea posible, introduciendo únicamente las restricciones y estados mínimos necesarios para que `editor` no publique.
- Preparar el sistema para evolucionar luego hacia workflows editoriales más ricos, sin implementarlos completos en esta iteración.

## Fuera de alcance

- Permisos directos por usuario.
- Múltiples roles por usuario.
- Jerarquías o herencia entre roles.
- Reglas `deny` explícitas.
- Auditoría avanzada de cambios o bitácora completa de permisos.
- Apertura de contribución pública.
- Un sistema completo de revisión entre pares con comentarios, asignaciones o colas avanzadas.

## Restricciones

- Buscar el camino más corto que resuelva el caso de negocio actual sin sobrediseñar.
- Mantener pocos permisos y nombres claros.
- No crear una UI excesivamente compleja de administración de accesos.
- Preservar compatibilidad con el flujo actual del panel mientras se migra al nuevo modelo.
- El rol `editor` no puede publicar artículos en esta primera versión.
- El flujo editorial mínimo debe distinguir entre borrador, revisión y publicación.

## Decisiones de producto ya tomadas

- Un usuario interno tiene un solo rol.
- Si un usuario necesita más capacidades, se amplían los permisos de su rol.
- `superadmin` es el perfil responsable de administrar accesos.
- El sistema debe ser sencillo de operar, pero flexible para cambiar capacidades por rol sin tocar código.

## Hipótesis de permisos base

La primera versión debe intentar cubrirse con un set pequeño de permisos como:

- `article.create`
- `article.edit`
- `article.review`
- `article.publish`
- `article.delete`
- `resource.manage`
- `image.upload`
- `access.manage`

La fase de spec podrá ajustar el naming exacto y el alcance de cada permiso, pero la expectativa es mantener el catálogo pequeño.

## Riesgos a resolver en diseño

- Cómo migrar desde `admin_users` a un modelo de usuarios con rol sin romper el login actual.
- Cómo aplicar autorización por acción en backend sin multiplicar complejidad en rutas Express.
- Cómo ocultar o deshabilitar acciones en UI sin confiar solo en el frontend.
- Cómo definir transiciones claras entre `draft`, `in_review`, `published` y `deprecated` sin crear un workflow demasiado pesado.
- Cómo sembrar roles y permisos iniciales sin introducir fricción operativa.

## Criterio de éxito

AI Hub puede operar con al menos dos perfiles internos distintos, donde `superadmin` configura accesos y `editor` puede trabajar sobre contenido y enviarlo a revisión sin capacidad de publicación, y el sistema queda preparado para ajustar permisos por rol más adelante sin rediseñar la base de autenticación/autorización.
