# Proposal — recursos-por-idioma

## Resumen

Se propone soportar recursos externos por idioma agregando `lang` al vínculo `article_resources`, manteniendo `resources` como catálogo global reutilizable.

## Por qué este enfoque

Es la opción con menor superficie de cambio que resuelve el problema real:

- el artículo ya es bilingüe por `article_contents`
- los recursos ya existen como catálogo compartido
- lo que falta distinguir es a qué idioma del artículo aplica cada vínculo

## Alcance incluido

- migración de base de datos para `article_resources.lang`
- backfill de vínculos actuales a `es` y `en`
- API admin para vincular y desvincular recursos por idioma
- API admin para devolver recursos agrupados por idioma
- API pública para filtrar recursos según el idioma de la ruta
- UI admin de artículo para gestionar recursos ES/EN por separado

## Alcance no incluido

- traducciones nativas de `title`, `description` o `url` dentro de un mismo recurso lógico
- rediseño de la biblioteca global de recursos
- cambios editoriales automáticos o sincronización inteligente entre idiomas

## Riesgos aceptados

- Tras migrar, artículos existentes verán inicialmente el mismo set de recursos en ambos idiomas.
- La curación fina quedará como trabajo editorial posterior.

## Resultado operativo

El sistema mantiene la misma biblioteca global, pero cada artículo pasa a tener dos listas de vínculos: una para `es` y otra para `en`.
