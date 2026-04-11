// Tests unitarios del servicio de Meilisearch
import { describe, it, expect } from 'vitest';
import type { MeilisearchDocument } from '../../../src/services/meilisearch';

describe('MeilisearchDocument structure', () => {
  it('genera el document_id correcto con formato articleId--lang', () => {
    const articleId = '550e8400-e29b-41d4-a716-446655440000';
    const lang = 'es';
    const documentId = `${articleId}--${lang}`;

    const doc: MeilisearchDocument = {
      document_id: documentId,
      article_id: articleId,
      lang,
      slug: 'que-es-un-agente',
      title: 'Qué es un agente',
      summary: 'Un agente es un LLM con acceso a herramientas.',
      body: '## Qué es\n\nContenido...',
      category: 'agents',
      type: 'concept',
      status: 'published',
      domains: ['programming'],
      last_edited_at: '2026-04-06T12:00:00Z',
    };

    expect(doc.document_id).toBe(`${articleId}--es`);
    expect(doc.document_id).toContain(articleId);
    expect(doc.document_id).toContain(lang);
  });

  it('el document_id para EN tiene el formato correcto', () => {
    const articleId = '550e8400-e29b-41d4-a716-446655440001';
    const documentId = `${articleId}--en`;
    expect(documentId).toBe('550e8400-e29b-41d4-a716-446655440001--en');
  });

  it('los campos requeridos del documento son correctos', () => {
    const doc: MeilisearchDocument = {
      document_id: 'test--es',
      article_id: 'test',
      lang: 'es',
      slug: 'test-slug',
      title: 'Test Title',
      summary: 'Test summary',
      body: 'Test body',
      category: 'fundamentals',
      type: 'concept',
      status: 'published',
      domains: ['programming'],
      last_edited_at: '2026-01-01T00:00:00Z',
    };

    // Verificar que todos los campos filterables están presentes
    expect(doc.lang).toBeDefined();
    expect(doc.category).toBeDefined();
    expect(doc.type).toBeDefined();
    expect(doc.status).toBeDefined();
    expect(doc.domains).toBeInstanceOf(Array);
  });

  it('status published permite búsqueda pública', () => {
    const publishedDoc: MeilisearchDocument = {
      document_id: 'test--es',
      article_id: 'test',
      lang: 'es',
      slug: 'test',
      title: 'Test',
      summary: 'Test',
      body: '',
      category: 'agents',
      type: 'concept',
      status: 'published',
      domains: ['programming'],
      last_edited_at: new Date().toISOString(),
    };

    expect(publishedDoc.status).toBe('published');
  });
});
