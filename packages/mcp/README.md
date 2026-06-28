# @ai-hub/mcp — Servidor MCP del AI Hub

Servidor [MCP](https://modelcontextprotocol.io) que permite a agentes de IA (Claude Code, opencode)
**leer, revisar, corregir y publicar** artículos del AI Hub directamente contra la API remota.

El proceso MCP corre **local en tu máquina**, pero todos los artículos viven y se modifican
**en remoto** (la NAS): el MCP es solo un traductor entre el agente y la API REST.

```
Agente (Claude/opencode) ──stdio──▶ MCP (local) ──HTTPS──▶ API AI Hub (NAS)
```

## Herramientas expuestas

| Herramienta | Qué hace | Permiso requerido en la API |
|---|---|---|
| `list_articles` | Lista artículos; filtra por `status` (draft/in_review/published/deprecated), `category`, `type`, `search` | lectura editorial |
| `read_article` | Devuelve un artículo completo (metadatos + contenido ES y EN) | lectura editorial |
| `create_article` | Crea un artículo desde cero (nace en draft); carga contenido inicial ES/EN si se provee | `article.create` (+ `article.edit` para el contenido) |
| `patch_article_content` | Edición parcial segura del body (find & replace exacto, sin reescribir el resto) | `article.edit` |
| `update_article_content` | Corrige el contenido de un idioma (mezcla solo los campos que cambias) | `article.edit` |
| `update_article_metadata` | Actualiza categoría, volatilidad, dominios, vigencia | `article.edit` |
| `verify_article` | Marca un idioma como verificado | `article.review` |
| `set_article_status` | Cambia el estado (incl. **publicar**), respetando transiciones válidas | `article.review` / `article.publish` |
| `add_relation` / `remove_relation` | Gestiona relaciones dirigidas (`related`/`prerequisite`/`next`) | `article.edit` |
| `add_resource` | Crea un recurso externo y lo vincula al artículo en un idioma (un solo paso) | `resource.manage` |
| `remove_resource` | Desvincula un recurso del artículo en un idioma | `resource.manage` |

Las reglas editoriales (transiciones de estado válidas, permisos) las aplica **el backend**:
el MCP no las puede saltar. Si tu usuario no tiene `article.publish`, la API rechaza la publicación.

## Build

```bash
npm install --workspace @ai-hub/mcp
npm run build --workspace @ai-hub/mcp
```

Esto genera `packages/mcp/dist/index.js`, que es el ejecutable que configuras en tus agentes.

## Configuración

El MCP se autentica con un **usuario admin existente** vía estas variables de entorno:

| Variable | Default | Descripción |
|---|---|---|
| `AIHUB_API_URL` | `https://api-aihub.oryslabs.com/api/v1` | URL base de la API (NAS). Cámbiala para apuntar a una API local. |
| `AIHUB_EMAIL` | — | Email del usuario admin |
| `AIHUB_PASSWORD` | — | Password del usuario admin |

> Las credenciales se pasan en la config del agente (abajo), no en un `.env` versionado.
> Hay un `.env.example` solo como referencia.

### Claude Code

Añade el servidor a tu `.mcp.json` (en la raíz del proyecto, para compartirlo) o a la config de
usuario. Usa la **ruta absoluta** al `dist/index.js` compilado:

```json
{
  "mcpServers": {
    "aihub": {
      "command": "node",
      "args": ["/home/marioyahuar/AiHub/packages/mcp/dist/index.js"],
      "env": {
        "AIHUB_API_URL": "https://api-aihub.oryslabs.com/api/v1",
        "AIHUB_EMAIL": "tu-admin@oryslabs.com",
        "AIHUB_PASSWORD": "tu-password"
      }
    }
  }
}
```

O por CLI:

```bash
claude mcp add aihub \
  --env AIHUB_EMAIL=tu-admin@oryslabs.com \
  --env AIHUB_PASSWORD=tu-password \
  -- node /home/marioyahuar/AiHub/packages/mcp/dist/index.js
```

### opencode

En tu `opencode.json` (o `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "aihub": {
      "type": "local",
      "command": ["node", "/home/marioyahuar/AiHub/packages/mcp/dist/index.js"],
      "enabled": true,
      "environment": {
        "AIHUB_API_URL": "https://api-aihub.oryslabs.com/api/v1",
        "AIHUB_EMAIL": "tu-admin@oryslabs.com",
        "AIHUB_PASSWORD": "tu-password"
      }
    }
  }
}
```

## Desarrollo

Sin compilar, con recarga directa de TypeScript:

```bash
AIHUB_EMAIL=... AIHUB_PASSWORD=... npm run dev --workspace @ai-hub/mcp
```

Para apuntar a una API local en vez de la NAS, exporta `AIHUB_API_URL=http://localhost:3001/api/v1`.
