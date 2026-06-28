#!/usr/bin/env node
// Servidor MCP del AI Hub.
// Expone herramientas para que agentes de IA (Claude Code, opencode) lean, revisen,
// corrijan y publiquen artículos contra la API remota del Hub.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { AiHubClient, AiHubApiError, type ArticleContent } from './client.js';

const baseUrl = process.env.AIHUB_API_URL ?? 'https://api-aihub.oryslabs.com/api/v1';
const email = process.env.AIHUB_EMAIL;
const password = process.env.AIHUB_PASSWORD;

if (!email || !password) {
  console.error(
    'Faltan credenciales. Define AIHUB_EMAIL y AIHUB_PASSWORD en la configuración del MCP.'
  );
  process.exit(1);
}

const client = new AiHubClient({ baseUrl, email, password });

/** Envuelve respuestas como texto JSON legible y traduce errores de la API a respuestas de error MCP. */
function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown) {
  const message =
    err instanceof AiHubApiError
      ? `[${err.status} ${err.code}] ${err.message}`
      : err instanceof Error
        ? err.message
        : String(err);
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
}

const server = new McpServer({ name: 'aihub', version: '1.0.0' });

// --- Lectura ---

server.registerTool(
  'list_articles',
  {
    title: 'Listar artículos',
    description:
      'Lista artículos del AI Hub con filtros opcionales. status: draft | in_review | published | deprecated (omitir = todos). type: concept | tool-branch.',
    inputSchema: {
      status: z.enum(['draft', 'in_review', 'published', 'deprecated']).optional(),
      category: z.string().optional(),
      type: z.enum(['concept', 'tool-branch']).optional(),
      search: z.string().optional(),
      page: z.number().int().positive().optional(),
      per_page: z.number().int().positive().max(100).optional(),
    },
  },
  async (args) => {
    try {
      return ok(await client.listArticles(args));
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  'read_article',
  {
    title: 'Leer artículo',
    description:
      'Devuelve un artículo completo por id, incluyendo metadatos, relaciones y el contenido en ambos idiomas (es y en) con slug, title, summary y body.',
    inputSchema: { id: z.string().describe('UUID del artículo') },
  },
  async ({ id }) => {
    try {
      return ok(await client.getArticle(id));
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Creación ---

// Esquema reutilizable para el contenido inicial de un idioma al crear un artículo.
const initialContent = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones')
      .optional()
      .describe('Slug del contenido en este idioma. Si se omite, se usa slug_uk.'),
    title: z.string().describe('Título en este idioma'),
    summary: z.string().describe('Resumen en este idioma'),
    body: z.string().optional().describe('Cuerpo en Markdown (opcional al crear)'),
  })
  .describe('Contenido inicial para un idioma');

server.registerTool(
  'create_article',
  {
    title: 'Crear artículo desde cero',
    description:
      'Crea un artículo nuevo (nace en estado draft). Crea la cáscara con metadatos y, si se ' +
      'proveen, carga el contenido inicial en español (content_es) y/o inglés (content_en). ' +
      'Reglas: type "tool-branch" requiere parent_id; type "concept" no admite parent_id. ' +
      'La categoría debe existir. Devuelve el artículo completo creado.',
    inputSchema: {
      slug_uk: z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones')
        .describe('Clave única del artículo (neutral al idioma)'),
      type: z.enum(['concept', 'tool-branch']),
      category: z.string().describe('Slug de una categoría existente'),
      parent_id: z.string().uuid().nullable().optional().describe('Requerido para tool-branch'),
      domains: z.array(z.string()).optional(),
      volatility: z.enum(['low', 'medium', 'high']).optional(),
      featured: z.boolean().optional(),
      content_es: initialContent.optional(),
      content_en: initialContent.optional(),
    },
  },
  async ({ slug_uk, type, category, parent_id, domains, volatility, featured, content_es, content_en }) => {
    try {
      const created = await client.createArticle({
        slug_uk,
        type,
        category,
        parent_id,
        domains,
        volatility,
        featured,
      });

      // Cargamos el contenido inicial por idioma si se proveyó.
      for (const [lang, content] of [
        ['es', content_es],
        ['en', content_en],
      ] as const) {
        if (content) {
          await client.putContent(created.id, {
            lang,
            slug: content.slug ?? slug_uk,
            title: content.title,
            summary: content.summary,
            body: content.body ?? '',
          });
        }
      }

      return ok(await client.getArticle(created.id));
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Corrección ---

server.registerTool(
  'update_article_content',
  {
    title: 'Corregir contenido de un artículo',
    description:
      'Actualiza el contenido de un artículo en un idioma. Solo necesitas pasar los campos que cambian: ' +
      'el MCP lee el contenido actual y mezcla tus cambios, así no se borra nada por accidente. ' +
      'Si el idioma aún no tiene contenido, debes proveer slug, title y summary.',
    inputSchema: {
      id: z.string().describe('UUID del artículo'),
      lang: z.enum(['es', 'en']),
      slug: z
        .string()
        .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones')
        .optional(),
      title: z.string().optional(),
      summary: z.string().optional(),
      body: z.string().optional().describe('Cuerpo del artículo en Markdown'),
    },
  },
  async ({ id, lang, slug, title, summary, body }) => {
    try {
      const article = await client.getArticle(id);
      const current = article.contents?.find((c) => c.lang === lang);

      const merged: ArticleContent = {
        lang,
        slug: slug ?? current?.slug ?? '',
        title: title ?? current?.title ?? '',
        summary: summary ?? current?.summary ?? '',
        body: body ?? current?.body ?? '',
      };

      if (!merged.slug || !merged.title || !merged.summary) {
        return fail(
          new Error(
            `El idioma "${lang}" no tiene contenido previo completo. Debes proveer slug, title y summary.`
          )
        );
      }

      return ok(await client.putContent(id, merged));
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  'patch_article_content',
  {
    title: 'Parchear contenido (find & replace exacto)',
    description:
      'Aplica ediciones puntuales al body de un idioma sin reescribir todo el artículo. ' +
      'Cada edición busca un fragmento literal (find) y lo reemplaza (replace). USAR ESTO para ' +
      'correcciones pequeñas (typos, reformular una frase): es seguro porque no toca el resto del ' +
      'texto ni el código. Cada "find" debe aparecer EXACTAMENTE una vez en el body; si no, no se ' +
      'aplica ningún cambio y se devuelve error (haz el "find" más largo/único). Preferir esta ' +
      'herramienta sobre update_article_content cuando solo cambian fragmentos.',
    inputSchema: {
      id: z.string().describe('UUID del artículo'),
      lang: z.enum(['es', 'en']),
      edits: z
        .array(
          z.object({
            find: z.string().min(1).describe('Fragmento literal a buscar (debe ser único en el body)'),
            replace: z.string().describe('Texto de reemplazo'),
          })
        )
        .min(1)
        .describe('Lista de ediciones a aplicar en orden'),
    },
  },
  async ({ id, lang, edits }) => {
    try {
      return ok(await client.patchContent(id, lang, edits));
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  'update_article_metadata',
  {
    title: 'Actualizar metadatos del artículo',
    description: 'Actualiza metadatos del artículo (categoría, volatilidad, dominios, vigencia).',
    inputSchema: {
      id: z.string().describe('UUID del artículo'),
      category: z.string().optional(),
      volatility: z.enum(['low', 'medium', 'high']).optional(),
      domains: z.array(z.string()).optional(),
      applicable_as_of: z.string().nullable().optional(),
    },
  },
  async ({ id, ...metadata }) => {
    try {
      return ok(await client.updateMetadata(id, metadata));
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Flujo editorial ---

server.registerTool(
  'verify_article',
  {
    title: 'Marcar contenido como verificado',
    description:
      'Marca el contenido de un idioma como verificado (revisión editorial). Requiere permiso article.review.',
    inputSchema: { id: z.string(), lang: z.enum(['es', 'en']) },
  },
  async ({ id, lang }) => {
    try {
      return ok(await client.verify(id, lang));
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  'set_article_status',
  {
    title: 'Cambiar estado del artículo',
    description:
      'Cambia el estado del artículo respetando las transiciones válidas del backend: ' +
      'draft → in_review → published (o deprecated). Publicar requiere permiso article.publish.',
    inputSchema: {
      id: z.string(),
      status: z.enum(['draft', 'in_review', 'published', 'deprecated']),
    },
  },
  async ({ id, status }) => {
    try {
      return ok(await client.setStatus(id, status));
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Relaciones ---

server.registerTool(
  'add_relation',
  {
    title: 'Agregar relación entre artículos',
    description:
      'Crea una relación dirigida desde el artículo hacia otro. type: related (lateral), ' +
      'prerequisite (lectura previa) o next (siguiente lectura). Las relaciones son direccionales.',
    inputSchema: {
      id: z.string().describe('UUID del artículo origen'),
      to_article_id: z.string().uuid().describe('UUID del artículo destino'),
      type: z.enum(['related', 'prerequisite', 'next']),
    },
  },
  async ({ id, to_article_id, type }) => {
    try {
      return ok(await client.addRelation(id, to_article_id, type));
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  'remove_relation',
  {
    title: 'Eliminar relación entre artículos',
    description: 'Elimina una relación dirigida del artículo hacia otro, del tipo indicado.',
    inputSchema: {
      id: z.string().describe('UUID del artículo origen'),
      to_article_id: z.string().uuid().describe('UUID del artículo destino'),
      type: z.enum(['related', 'prerequisite', 'next']),
    },
  },
  async ({ id, to_article_id, type }) => {
    try {
      await client.removeRelation(id, to_article_id, type);
      return ok({ removed: { from: id, to: to_article_id, type } });
    } catch (err) {
      return fail(err);
    }
  }
);

// --- Recursos ---

server.registerTool(
  'add_resource',
  {
    title: 'Agregar recurso externo a un artículo',
    description:
      'Crea un recurso externo y lo vincula al artículo en el idioma indicado, en un solo paso. ' +
      'type: doc | video | course | article. Prefiere fuentes oficiales, papers y posts de ingeniería ' +
      'de calidad; recursos vigentes (≤3 años salvo referencia histórica). Requiere permiso resource.manage.',
    inputSchema: {
      id: z.string().describe('UUID del artículo'),
      lang: z.enum(['es', 'en']),
      title: z.string(),
      type: z.enum(['doc', 'video', 'course', 'article']),
      url: z.string().url(),
      description: z.string().optional(),
    },
  },
  async ({ id, lang, title, type, url, description }) => {
    try {
      const resource = await client.createResource({ title, type, url, description });
      await client.linkResource(id, resource.id, lang);
      return ok({ resource, linked_to: id, lang });
    } catch (err) {
      return fail(err);
    }
  }
);

server.registerTool(
  'remove_resource',
  {
    title: 'Desvincular recurso de un artículo',
    description:
      'Desvincula un recurso de un artículo en un idioma. No borra la entidad recurso, solo el vínculo.',
    inputSchema: {
      id: z.string().describe('UUID del artículo'),
      resource_id: z.string().uuid(),
      lang: z.enum(['es', 'en']),
    },
  },
  async ({ id, resource_id, lang }) => {
    try {
      await client.unlinkResource(id, resource_id, lang);
      return ok({ unlinked: { article: id, resource_id, lang } });
    } catch (err) {
      return fail(err);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // En stdio, stderr es seguro para logs (stdout es el canal del protocolo).
  console.error(`AI Hub MCP conectado → ${baseUrl}`);
}

main().catch((err) => {
  console.error('Fallo al iniciar el MCP del AI Hub:', err);
  process.exit(1);
});
