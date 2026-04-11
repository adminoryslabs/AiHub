// Página de listado de artículos por categoría
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { Footer } from '@/components/layout/Footer';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { getCategories, getArticles, ApiClientError } from '@/lib/api-client';
import { isValidLang, getCategoryIcon, type SupportedLang } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ lang: string; category: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, category } = await params;
  if (!isValidLang(lang)) return {};

  const validLang = lang as SupportedLang;

  try {
    const categories = await getCategories(validLang);
    const cat = categories.find((c) => c.slug === category);

    return {
      title: cat?.name,
      description: `${cat?.article_count || 0} artículos sobre ${cat?.name}`,
      alternates: {
        canonical: `/${lang}/${category}`,
        languages: {
          es: `/es/${category}`,
          en: `/en/${category}`,
        },
      },
    };
  } catch {
    return {};
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { lang, category } = await params;

  if (!isValidLang(lang)) notFound();

  const validLang = lang as SupportedLang;
  const isEs = validLang === 'es';

  let categories;
  let articles;

  try {
    [categories, articles] = await Promise.all([
      getCategories(validLang),
      getArticles({ lang: validLang, category }),
    ]);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const currentCategory = categories.find((c) => c.slug === category);
  if (!currentCategory && articles.data.length === 0) notFound();

  return (
    <>
      <Navbar lang={validLang} currentPath={`/${lang}/${category}`} />
      <SidebarLeft lang={validLang} categories={categories} currentCategory={category} />

      <main className="pt-24 pb-16 md:pl-72 px-6 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-8" aria-label="Breadcrumb">
            <Link href={`/${lang}`} className="hover:text-primary transition-colors">
              {isEs ? 'Inicio' : 'Home'}
            </Link>
            <Icon name="chevron_right" size="sm" />
            <span className="text-on-surface font-medium">{currentCategory?.name || category}</span>
          </nav>

          {/* Header de categoría */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center flex-shrink-0">
              <Icon name={getCategoryIcon(category)} size="xl" />
            </div>
            <div>
              <h1 className="font-headline text-3xl font-bold text-on-surface">
                {currentCategory?.name || category}
              </h1>
              <p className="text-on-surface-variant">
                {articles.pagination.total} {isEs ? 'artículos' : 'articles'}
              </p>
            </div>
          </div>

          {/* Lista de artículos */}
          {articles.data.length > 0 ? (
            <div className="space-y-3">
              {articles.data.map((article) => (
                <Link
                  key={article.id}
                  href={`/${lang}/${category}/${article.localized_slug}`}
                  className="group block p-6 bg-surface-container-lowest dark:bg-surface-container border border-outline-variant/10 rounded-2xl hover:border-primary/20 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={article.type === 'concept' ? 'primary' : 'outline'}>
                          {article.type === 'concept'
                            ? isEs ? 'Concepto' : 'Concept'
                            : isEs ? 'Herramienta' : 'Tool'}
                        </Badge>
                        {article.featured && (
                          <Badge variant="success">{isEs ? 'Destacado' : 'Featured'}</Badge>
                        )}
                      </div>
                      <h2 className="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                    </div>
                    <Icon
                      name="arrow_forward"
                      className="text-on-surface-variant flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant text-center py-16">
              {isEs ? 'No hay artículos en esta categoría aún.' : 'No articles in this category yet.'}
            </p>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
