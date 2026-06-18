// Página de listado de artículos por categoría — estilo terminal
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
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
      <SidebarLeft lang={validLang} categories={categories} currentCategory={category} />

      <main className="pt-24 pb-16 md:pl-72 px-6 min-h-screen">
        <div className="max-w-4xl mx-auto font-mono">
          {/* Breadcrumb */}
          <nav className="text-[13px] text-on-surface-variant mb-7" aria-label="Breadcrumb">
            <span className="text-primary">~</span>/{' '}
            <Link href={`/${lang}`} className="hover:text-primary transition-colors">
              {isEs ? 'inicio' : 'home'}
            </Link>{' '}/{' '}
            <span className="text-on-surface lowercase">{category}</span>
          </nav>

          {/* Cabecera de categoría */}
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-primary text-[13px]">[dir]</span>
            <h1 className="font-mono font-bold text-[34px] tracking-tight text-on-surface lowercase">
              {category}
            </h1>
            <span className="text-[13px] text-on-surface-variant">
              {articles.pagination.total} {isEs ? 'artículos' : 'articles'}
            </span>
          </div>

          {description && (
            <p className="font-body text-sm text-on-surface-variant max-w-2xl mb-6">
              {description}
            </p>
          )}

          {/* Línea de filtros decorativa */}
          <p className="text-[13px] text-on-surface-variant mb-4">
            filter: <span className="text-primary">--all</span>{' '}
            <span className="opacity-60">--concepts</span>{' '}
            <span className="opacity-60">--tools</span>
          </p>

          {/* Lista de artículos */}
          {articles.data.length > 0 ? (
            <div className="border border-outline-variant bg-surface-container-lowest dark:bg-surface-container rounded-md overflow-hidden">
              {articles.data.map((article) => (
                <Link
                  key={article.id}
                  href={`/${lang}/${category}/${article.localized_slug}`}
                  className="group block px-4 py-4 border-b border-outline-variant last:border-b-0 hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-primary">›</span>
                    <Badge variant={article.type === 'concept' ? 'primary' : 'outline'}>
                      {article.type === 'concept'
                        ? isEs ? 'concepto' : 'concept'
                        : isEs ? 'herramienta' : 'tool'}
                    </Badge>
                    {article.featured && (
                      <Badge variant="success">★ {isEs ? 'destacado' : 'featured'}</Badge>
                    )}
                    <span className="ml-auto text-[12px] text-on-surface-variant">
                      updated {article.last_edited_at?.slice(0, 7) ?? '—'}
                    </span>
                  </div>
                  <h2 className="font-mono font-bold text-[18px] text-on-surface group-hover:text-primary transition-colors pl-5">
                    {article.title}
                  </h2>
                  <p className="font-body text-[13.5px] leading-relaxed text-on-surface-variant mt-1.5 pl-5">
                    {article.summary}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-outline-variant bg-surface-container-lowest dark:bg-surface-container rounded-md p-10 text-center">
              <p className="font-mono text-sm text-on-surface-variant">
                {isEs ? 'sin artículos en esta categoría aún' : 'no articles in this category yet'}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
