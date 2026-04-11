// Servicio de Meilisearch: indexado y búsqueda de artículos
import { MeiliSearch } from 'meilisearch';

const INDEX_NAME = 'articles';

let client: MeiliSearch;

export function getMeilisearchClient(): MeiliSearch {
  if (!client) {
    client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY || '',
    });
  }
  return client;
}

// Documento que se indexa en Meilisearch por cada combinación artículo+idioma
export interface MeilisearchDocument {
  document_id: string;
  article_id: string;
  lang: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  type: string;
  status: string;
  domains: string[];
  last_edited_at: string;
}

// Configurar el índice con atributos buscables, filtrables y ordenables
export async function setupMeilisearchIndex(): Promise<void> {
  const meili = getMeilisearchClient();
  const index = meili.index(INDEX_NAME);

  await index.updateSettings({
    searchableAttributes: ['title', 'summary', 'body'],
    filterableAttributes: ['lang', 'category', 'type', 'status', 'domains'],
    sortableAttributes: ['last_edited_at', 'title'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  });
}

// Agregar o actualizar un documento en el índice
export async function upsertDocument(doc: MeilisearchDocument): Promise<void> {
  const meili = getMeilisearchClient();
  await meili.index(INDEX_NAME).addDocuments([doc], { primaryKey: 'document_id' });
}

// Eliminar los documentos de un artículo (ambos idiomas)
export async function deleteArticleDocuments(articleId: string): Promise<void> {
  const meili = getMeilisearchClient();
  await meili.index(INDEX_NAME).deleteDocuments([`${articleId}--es`, `${articleId}--en`]);
}

// Actualizar el campo status de un documento
export async function updateDocumentStatus(articleId: string, status: string): Promise<void> {
  const meili = getMeilisearchClient();
  const index = meili.index(INDEX_NAME);

  // Actualizar ambos idiomas si existen
  for (const lang of ['es', 'en']) {
    await index
      .updateDocuments([{ document_id: `${articleId}--${lang}`, status }], {
        primaryKey: 'document_id',
      })
      .catch(() => {
        // Si el documento no existe, ignorar el error
      });
  }
}

// Verificar conectividad con Meilisearch
export async function checkMeilisearchConnection(): Promise<boolean> {
  try {
    const meili = getMeilisearchClient();
    await meili.health();
    return true;
  } catch {
    return false;
  }
}

// Buscar artículos en Meilisearch
export async function searchArticles(
  query: string,
  filters: {
    lang?: string;
    category?: string;
    limit?: number;
  }
): Promise<{
  hits: MeilisearchDocument[];
  estimatedTotalHits: number;
  processingTimeMs: number;
}> {
  const meili = getMeilisearchClient();

  // Construir filtros: siempre filtrar por status = published
  const filterParts: string[] = ['status = published'];
  if (filters.lang) {
    filterParts.push(`lang = ${filters.lang}`);
  }
  if (filters.category) {
    filterParts.push(`category = ${filters.category}`);
  }

  const result = await meili.index(INDEX_NAME).search<MeilisearchDocument>(query, {
    filter: filterParts.join(' AND '),
    limit: filters.limit || 20,
    attributesToHighlight: ['title', 'summary'],
    highlightPreTag: '<em>',
    highlightPostTag: '</em>',
  });

  return {
    hits: result.hits,
    estimatedTotalHits: result.estimatedTotalHits || 0,
    processingTimeMs: result.processingTimeMs,
  };
}
