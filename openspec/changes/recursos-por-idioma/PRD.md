# PRD — recursos-por-idioma

## Objetivo

Permitir que un artículo tenga recursos externos distintos para español e inglés, sin rediseñar el catálogo global de recursos.

## Problema actual

Hoy los recursos se vinculan al artículo completo. Como el artículo tiene contenido bilingüe, ambos idiomas terminan mostrando el mismo set de recursos aunque la curación ideal no siempre coincide.

## Resultado esperado

- El admin puede vincular recursos distintos para `es` y `en`.
- El sitio público muestra solo los recursos del idioma de la página actual.
- El cambio reutiliza el modelo actual tanto como sea posible.

## Restricciones

- Buscar el camino más corto.
- No convertir `resources` en una entidad completamente traducible en esta iteración.
- Mantener el panel global de recursos como biblioteca reutilizable.

## Criterio de éxito

Un artículo puede mostrar recursos diferentes en `/es/...` y `/en/...` sin afectar el resto del contrato bilingüe existente.
