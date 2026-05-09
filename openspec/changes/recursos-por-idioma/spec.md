# Spec — recursos-por-idioma

## 1. Fundación compartida

### 1.1 Requisito de datos

El sistema debe permitir asociar un recurso a un artículo para un idioma específico `es` o `en`.

### 1.2 Requisito de compatibilidad

Los recursos existentes ya vinculados a artículos deben preservarse tras la migración.

### 1.3 Requisito de contrato admin

El detalle admin de un artículo debe devolver los recursos agrupados por idioma.

Formato esperado:

```ts
resources: {
  es: Resource[];
  en: Resource[];
}
```

### 1.4 Requisito de escritura admin

Al vincular un recurso a un artículo, el admin debe indicar el idioma destino.

### 1.5 Requisito de lectura pública

La API pública de artículo debe devolver solo los recursos del idioma solicitado en la ruta.

## 2. Módulo: Sitio público

### 2.1 Render por idioma

Una página pública en `/es/...` debe mostrar solo recursos vinculados a `es`.

### 2.2 Aislamiento entre idiomas

Una página pública en `/en/...` no debe mostrar recursos vinculados solo a `es`.

## 3. Módulo: Panel de admin

### 3.1 Gestión separada por idioma

El editor de artículo debe permitir ver y operar recursos de `es` y `en` por separado.

### 3.2 Biblioteca global intacta

La pantalla global de recursos puede seguir administrando recursos sin un filtro obligatorio por idioma, porque el idioma vive en el vínculo con el artículo.

## 4. Casos de aceptación

1. Si un recurso se vincula solo a `es`, aparece en admin bajo `es` y en la página pública en español.
2. Si un recurso se vincula solo a `en`, aparece en admin bajo `en` y en la página pública en inglés.
3. Si un recurso se vincula a ambos idiomas, aparece en ambas vistas públicas.
4. Tras la migración, los recursos previamente existentes siguen visibles en ambos idiomas hasta edición manual.
