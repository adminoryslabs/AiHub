// Dashboard del panel de administración
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listAdminArticles } from '@/lib/admin-api-client';
import { StatusBadge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

interface ArticleItem {
  id: string;
  slug_uk: string;
  type: string;
  category: string;
  status: string;
  updated_at: string;
  content_status: {
    es?: { title: string; has_body: boolean; last_verified_at: string | null };
    en?: { title: string; has_body: boolean; last_verified_at: string | null };
  };
}

interface Stats {
  total: number;
  published: number;
  draft: number;
  deprecated: number;
}

export default function AdminDashboard() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, published: 0, draft: 0, deprecated: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await listAdminArticles({ per_page: 10 });
        const data = res?.data as ArticleItem[] || [];
        setArticles(data);

        // Calcular stats
        const allRes = await listAdminArticles({ per_page: 100 });
        const allArticles = allRes?.data as ArticleItem[] || [];
        setStats({
          total: allArticles.length,
          published: allArticles.filter((a) => a.status === 'published').length,
          draft: allArticles.filter((a) => a.status === 'draft').length,
          deprecated: allArticles.filter((a) => a.status === 'deprecated').length,
        });
      } catch {
        // Error ya manejado por el layout (redirect a login)
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const statCards = [
    { label: 'Total', value: stats.total, icon: 'article', color: 'text-primary' },
    { label: 'Publicados', value: stats.published, icon: 'check_circle', color: 'text-green-600' },
    { label: 'Borradores', value: stats.draft, icon: 'edit', color: 'text-on-surface-variant' },
    { label: 'Obsoletos', value: stats.deprecated, icon: 'archive', color: 'text-error' },
  ];

  function getTitle(article: ArticleItem) {
    return article.content_status?.es?.title || article.content_status?.en?.title || article.slug_uk;
  }

  function isOutdated(article: ArticleItem): boolean {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const esOutdated =
      article.content_status?.es &&
      (!article.content_status.es.last_verified_at ||
        new Date(article.content_status.es.last_verified_at) < thirtyDaysAgo);
    const enOutdated =
      article.content_status?.en &&
      (!article.content_status.en.last_verified_at ||
        new Date(article.content_status.en.last_verified_at) < thirtyDaysAgo);
    return Boolean(esOutdated || enOutdated);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-headline text-2xl font-bold text-on-surface">Dashboard</h1>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-dim transition-colors"
        >
          <Icon name="add" size="sm" />
          Nuevo artículo
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="p-6 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl"
          >
            <Icon name={card.icon} className={`${card.color} mb-2`} size="lg" />
            <p className="text-3xl font-headline font-bold text-on-surface">{card.value}</p>
            <p className="text-sm text-on-surface-variant mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Últimos artículos */}
      <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10">
          <h2 className="font-headline font-bold text-on-surface">Artículos recientes</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-on-surface-variant text-sm">Cargando...</div>
        ) : articles.length === 0 ? (
          <div className="p-6 text-center text-on-surface-variant text-sm">
            No hay artículos aún.{' '}
            <Link href="/admin/articles/new" className="text-primary hover:underline">
              Crear primero
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/admin/articles/${article.id}`}
                className="flex items-center gap-4 p-4 hover:bg-surface-container transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-on-surface text-sm truncate">{getTitle(article)}</p>
                    {isOutdated(article) && article.status === 'published' && (
                      <Icon name="warning" size="sm" className="text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">{article.category}</p>
                </div>
                <StatusBadge status={article.status} />
                <p className="text-xs text-on-surface-variant flex-shrink-0">
                  {new Date(article.updated_at).toLocaleDateString('es-ES')}
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-outline-variant/10">
          <Link href="/admin/articles" className="text-sm text-primary hover:underline">
            Ver todos los artículos →
          </Link>
        </div>
      </div>
    </div>
  );
}
