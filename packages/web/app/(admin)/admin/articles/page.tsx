// Lista de artículos del panel admin con filtros y paginación
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { listAdminArticles, updateArticleStatus } from '@/lib/admin-api-client';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface ArticleItem {
  id: string;
  slug_uk: string;
  type: string;
  category: string;
  status: string;
  featured: boolean;
  updated_at: string;
  children_count: number;
  content_status: {
    es?: { title: string; has_body: boolean; last_verified_at: string | null; last_edited_at: string };
    en?: { title: string; has_body: boolean; last_verified_at: string | null; last_edited_at: string };
  };
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['published'],
  published: ['deprecated'],
  deprecated: ['draft'],
};

function getContentIndicator(content?: {
  title: string;
  has_body: boolean;
  last_verified_at: string | null;
  last_edited_at: string;
}): string {
  if (!content) return '—';
  if (!content.has_body) return '⚠️';
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (!content.last_verified_at || new Date(content.last_verified_at) < thirtyDaysAgo) return '🕐';
  return '✅';
}

export default function ArticlesListPage() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '', type: '', search: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 20;

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminArticles({ ...filters, page, per_page: PER_PAGE });
      setArticles(res?.data as ArticleItem[] || []);
      setTotal((res?.pagination as { total: number })?.total || 0);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  async function handleStatusChange(id: string, currentStatus: string) {
    const nextStatus = STATUS_TRANSITIONS[currentStatus]?.[0];
    if (!nextStatus) return;
    if (!confirm(`¿Cambiar estado a "${nextStatus}"?`)) return;

    try {
      await updateArticleStatus(id, nextStatus);
      await loadArticles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  }

  function getTitle(article: ArticleItem) {
    return article.content_status?.es?.title || article.content_status?.en?.title || article.slug_uk;
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-2xl font-bold text-on-surface">Artículos</h1>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-dim transition-colors"
        >
          <Icon name="add" size="sm" />
          Nuevo artículo
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-surface-container-low rounded-2xl">
        <input
          type="text"
          placeholder="Buscar por título o slug..."
          value={filters.search}
          onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
          className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          className="px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="published">Publicado</option>
          <option value="deprecated">Obsoleto</option>
        </select>
        <select
          value={filters.type}
          onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(1); }}
          className="px-3 py-2 bg-white border border-outline-variant/30 rounded-xl text-sm focus:outline-none"
        >
          <option value="">Todos los tipos</option>
          <option value="concept">Concepto</option>
          <option value="tool-branch">Herramienta</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant">Cargando...</div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">No hay artículos.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-container border-b border-outline-variant/10">
              <tr>
                <th className="text-left p-4 font-semibold text-on-surface-variant">Título</th>
                <th className="text-left p-4 font-semibold text-on-surface-variant hidden lg:table-cell">Categoría</th>
                <th className="text-left p-4 font-semibold text-on-surface-variant hidden md:table-cell">Estado</th>
                <th className="text-center p-4 font-semibold text-on-surface-variant">ES</th>
                <th className="text-center p-4 font-semibold text-on-surface-variant">EN</th>
                <th className="text-right p-4 font-semibold text-on-surface-variant">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-surface-container/50 transition-colors">
                  <td className="p-4">
                    <div>
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="font-medium text-on-surface hover:text-primary transition-colors"
                      >
                        {getTitle(article)}
                      </Link>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant={article.type === 'concept' ? 'primary' : 'outline'}>
                          {article.type === 'concept' ? 'concepto' : 'tool'}
                        </Badge>
                        {article.featured && <Badge variant="success">destacado</Badge>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-on-surface-variant hidden lg:table-cell">
                    {article.category}
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="p-4 text-center">{getContentIndicator(article.content_status?.es)}</td>
                  <td className="p-4 text-center">{getContentIndicator(article.content_status?.en)}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"
                        title="Editar"
                      >
                        <Icon name="edit" size="sm" />
                      </Link>
                      {STATUS_TRANSITIONS[article.status]?.length > 0 && (
                        <button
                          onClick={() => handleStatusChange(article.id, article.status)}
                          className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors text-xs"
                          title={`Cambiar a ${STATUS_TRANSITIONS[article.status]?.[0]}`}
                        >
                          <Icon name="sync" size="sm" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-outline-variant/10">
            <p className="text-sm text-on-surface-variant">
              {total} artículos — Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
