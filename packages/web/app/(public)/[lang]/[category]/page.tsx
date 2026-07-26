// Página de listado de artículos por categoría — filas con número, meta, título y flecha
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { Footer } from '@/components/layout/Footer';
import { Icon } from '@/components/ui/Icon';
import { getCategories, getArticles, ApiClientError } from '@/lib/api-client';
import {
  isValidLang,
  getCategoryDescription,
  type SupportedLang,
} from '@/lib/i18n';

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

  const description = getCategoryDescription(category, validLang);

  return (
    <>
      <Navbar lang={validLang} currentPath={`/${lang}/${category}`} />

      <div className="mx-auto max-w-[1220px] flex items-start">
        <SidebarLeft
          lang={validLang}
          categories={categories}
          currentCategory={category}
        />

        <main className="flex-1 min-w-0 px-6 sm:px-11 pb-16">
          <div className="max-w-[760px] mx-auto">
            {/* Breadcrumb */}
            <nav
              className="font-mono text-[12px] text-on-surface-variant pt-7"
              aria-label="Breadcrumb"
            >
              <Link
                href={`/${lang}`}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {isEs ? 'Inicio' : 'Home'}
              </Link>
              <span className="mx-2 text-outline-variant">/</span>
              <span className="text-on-surface">{currentCategory?.name ?? category}</span>
            </nav>

            {/* Cabecera de categoría */}
            <header className="pt-5 pb-6 border-b border-outline">
              <div className="flex items-baseline gap-3.5 mb-3.5">
                <h1 className="font-headline font-semibold text-[40px] sm:text-[48px] leading-[1] tracking-[-0.03em] text-on-surface">
                  {currentCategory?.name ?? category}
                </h1>
                <span className="font-mono text-[13px] text-on-surface-variant">
                  {articles.pagination.total}{' '}
                  {isEs
                    ? articles.pagination.total === 1
                      ? 'artículo'
                      : 'artículos'
                    : articles.pagination.total === 1
                      ? 'article'
                      : 'articles'}
                </span>
              </div>
              {description && (
                <p className="font-body text-[18px] leading-[1.5] text-on-surface-variant max-w-[54ch]">
                  {description}
                </p>
              )}
            </header>

            {/* Lista de artículos */}
            {articles.data.length > 0 ? (
              <div className="flex flex-col">
                {articles.data.map((article, index) => {
                  const typeLabel = isEs
                    ? article.type === 'tutorial' ? 'Tutorial' : 'Concepto'
                    : article.type === 'tutorial' ? 'Tutorial' : 'Concept';
                  return (
                    <Link
                      key={article.id}
                      href={`/${lang}/${category}/${article.localized_slug}`}
                      className="group grid grid-cols-[48px_minmax(0,1fr)_auto] gap-5 sm:gap-6 items-center py-6 border-b border-outline-variant hover:bg-surface-container transition-colors -mx-3 px-3"
                    >
                      <span className="font-mono text-[14px] font-medium text-primary-text">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5 mb-2">
                          <span className="font-mono text-[10.5px] font-medium tracking-[0.09em] text-on-surface-variant">
                            {typeLabel.toUpperCase()}
                          </span>
                          {article.featured && (
                            <span className="font-mono text-[10.5px] font-semibold text-primary-text bg-primary-container px-2 py-0.5">
                              {isEs ? 'Destacado' : 'Featured'}
                            </span>
                          )}
                        </div>
                        <h2 className="font-headline font-semibold text-[20px] sm:text-[22px] leading-[1.15] tracking-[-0.02em] text-on-surface mb-1.5">
                          {article.title}
                        </h2>
                        <p className="font-body text-[14px] leading-[1.5] text-on-surface-variant max-w-[62ch] line-clamp-2">
                          {article.summary}
                        </p>
                      </div>
                      <Icon
                        name="arrow_forward"
                        className="text-[22px] text-on-surface-variant group-hover:text-primary-text transition-colors"
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="font-body text-[15px] text-on-surface-variant">
                  {isEs
                    ? 'Sin artículos en esta categoría aún.'
                    : 'No articles in this category yet.'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
