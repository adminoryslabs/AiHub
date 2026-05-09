# Design — recursos-por-idioma

## 1. Fundación compartida

### 1.1 Modelo de datos

Se modifica `article_resources` para agregar `lang`:

```sql
lang VARCHAR(2) NOT NULL CHECK (lang IN ('es', 'en'))
```

La restricción única pasa de:

```sql
(article_id, resource_id)
```

a:

```sql
(article_id, resource_id, lang)
```

### 1.2 Razón del modelo

- Mantiene `resources` como catálogo global.
- Evita rediseñar el CRUD global.
- Permite que un mismo recurso exista en uno o ambos idiomas del artículo.

### 1.3 Migración

Pasos:

1. Crear nueva columna `lang` aceptando nulos temporalmente.
2. Duplicar cada fila actual de `article_resources` para `es` y `en`.
3. Eliminar filas antiguas sin `lang` si el plan de migración lo requiere.
4. Marcar `lang` como `NOT NULL`.
5. Reemplazar la unique constraint por `(article_id, resource_id, lang)`.

Nota:
- La migración puede implementarse con tabla temporal o con recreación controlada de constraint según conveniencia del SQL existente.

### 1.4 Contratos API

#### Admin artículo detalle

Antes:

```ts
resources: Resource[]
```

Después:

```ts
resources: {
  es: Resource[];
  en: Resource[];
}
```

#### Admin vincular recurso

`POST /api/v1/admin/articles/:id/resources`

Body:

```ts
{
  resource_id: string;
  lang: 'es' | 'en';
}
```

#### Admin desvincular recurso

`DELETE /api/v1/admin/articles/:id/resources/:resource_id?lang=es`

#### Público detalle artículo

- La ruta pública sigue igual.
- La query de recursos filtra por el `lang` ya resuelto en la request.

### 1.5 Tipos compartidos

- `Resource` no necesita `lang`.
- `AdminArticle.resources` cambia a un objeto agrupado por idioma.
- `Article.resources` público puede seguir como `Resource[]` ya filtrado.

## 2. Módulo: Sitio público

### 2.1 Backend público

La query de recursos en `public/articles.ts` debe agregar filtro por `lang` en `article_resources`.

### 2.2 Frontend público

`SidebarRight` no cambia de estructura de datos; solo consume el array ya filtrado.

Mejora menor opcional:
- localizar el título de sección `Recursos` / `Resources`.

## 3. Módulo: Panel de admin

### 3.1 Backend admin

- En el GET de artículo, ejecutar una query de recursos con `lang` y agrupar en memoria por `es` y `en`.
- En link/unlink, validar `lang` con `zod`.

### 3.2 Frontend admin

La pestaña de recursos del artículo debe mostrar dos listas separadas o un selector de idioma.

Decisión recomendada:
- mantener una sola pestaña `Recursos`
- agregar un selector simple `ES | EN`

Razón:
- menor cambio de navegación
- menor ruido visual
- reusa casi toda la UI actual

### 3.3 Biblioteca global de recursos

`/admin/resources` se mantiene casi igual. Sigue creando y editando recursos globales. El idioma se decide al vincularlos desde el artículo.
