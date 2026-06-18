// Página de artículo completo con SSR — estilo terminal
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { SidebarRight } from '@/components/layout/SidebarRight';
import { Footer } from '@/components/layout/Footer';
import { ArticleRenderer } from '@/components/article/ArticleRenderer';
import { MermaidLoader } from '@/components/article/MermaidLoader';
import { CodeCopyEnhancer } from '@/components/article/CodeCopyEnhancer';
import { Badge } from '@/components/ui/Badge';
import { getCategories, getArticle, ApiClientError } from '@/lib/api-client';
import { markdownToHtml, extractToc } from '@/lib/markdown';
import { isValidLang, type SupportedLang } from '@/lib/i18n';
import type { Volatility } from '@ai-hub/shared';

interface PageProps {
  params: Promise<{ lang: string; category: string; slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihub.example.com';

// Etiqueta de volatilidad localizada
function volatilityLabel(v: Volatility, isEs: boolean): string {
  const map: Record<Volatility, { es: string; en: string }> = {
    low: { es: 'estable', en: 'stable' },
    medium: { es: 'cambiante', en: 'changing' },
    high: { es: 'volátil', en: 'volatile' },
  };
  return map[v]?.[isEs ? 'es' : 'en'] ?? v;
}

// Estimación de tiempo de lectura (palabras / 200)
function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, category, slug } = await params;

  if (!isValidLang(lang)) return {};

  const validLang = lang as SupportedLang;

  try {
    const article = await getArticle(slug, validLang);

    const canonical = `${SITE_URL}/${lang}/${category}/${slug}`;
    const alternateLangs: Record<string, string> = {
      [lang]: canonical,
    };
    if (article.alternate_lang) {
      alternateLangs[article.alternate_lang.lang] =
        `${SITE_URL}${article.alternate_lang.url}`;
    }

    return {
      title: article.title,
      description: article.summary,
      alternates: {
        canonical,
        languages: alternateLangs,
      },
      openGraph: {
        type: 'article',
        title: article.title,
        description: article.summary,
        url: canonical,
        modifiedTime: article.last_edited_at,
      },
    };
  } catch {
    return {};
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { lang, category, slug } = await params;

  if (!isValidLang(lang)) notFound();

  const validLang = lang as SupportedLang;
  const isEs = validLang === 'es';

  let article;
  let categories;

  try {
    [article, categories] = await Promise.all([
      getArticle(slug, validLang),
      getCategories(validLang),
    ]);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  // Renderizar markdown en el servidor
  const bodyHtml = await markdownToHtml(article.body);
  const toc = extractToc(article.body);

  const currentPath = `/${lang}/${category}/${slug}`;
  const readMin = readingMinutes(article.body);
  const updatedMonth = article.last_edited_at?.slice(0, 7) ?? '—';

  return (
    <>
      <Navbar lang={validLang} currentPath={currentPath} alternateUrl={article.alternate_lang?.url} />
      <SidebarLeft lang={validLang} categories={categories} currentCategory={category} />

      <main className="pt-24 pb-16 md:pl-72 xl:pr-[320px] px-6 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="font-mono text-[13px] text-on-surface-variant mb-6" aria-label="Breadcrumb">
            <span className="text-primary">~</span>/{' '}
            <Link href={`/${lang}`} className="hover:text-primary transition-colors">
              {isEs ? 'inicio' : 'home'}
            </Link>{' '}/{' '}
            <Link href={`/${lang}/${category}`} className="hover:text-primary transition-colors lowercase">
              {category}
            </Link>{' '}/{' '}
            <span className="text-on-surface lowercase">{slug}</span>
          </nav>

          {/* Header del artículo */}
          <header className="mb-8 font-mono">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant={article.type === 'concept' ? 'primary' : 'outline'}>
                {article.type === 'concept'
                  ? isEs ? 'concepto' : 'concept'
                  : isEs ? 'herramienta' : 'tool'}
              </Badge>
              <Badge variant="outline">{volatilityLabel(article.volatility, isEs)}</Badge>
              {article.applicable_as_of && (
                <Badge variant="outline">v{article.applicable_as_of}</Badge>
              )}
            </div>

            <h1 className="font-mono font-bold text-[40px] leading-[1.12] tracking-tight text-on-surface mb-4">
              {article.title}
            </h1>

            <p className="font-body text-lg leading-relaxed text-on-surface-variant mb-4">
              {article.summary}
            </p>

            <p className="text-[12.5px] text-on-surface-variant py-3 border-y border-outline-variant">
              // {readMin} {isEs ? 'min de lectura' : 'min read'} ·{' '}
              <span className="text-primary">●</span> updated {updatedMonth}
            </p>
          </header>

          {/* Ramas (tool-branches) del concepto */}
          {article.tool_branches && article.tool_branches.length > 0 && (
            <section className="mb-8 font-mono">
              <p className="text-[12.5px] text-on-surface-variant mb-3">
                // {isEs ? 'implementaciones' : 'implementations'}
              </p>
              <div className="border border-outline-variant bg-surface-container-lowest dark:bg-surface-container rounded-md overflow-hidden">
                {article.tool_branches.map((branch) => (
                  <Link
                    key={branch.id}
                    href={`/${lang}/${branch.category}/${branch.localized_slug}`}
                    className="group flex items-center gap-3 px-4 py-3 border-b border-outline-variant last:border-b-0 hover:bg-surface-container transition-colors"
                  >
                    <span className="text-primary">→</span>
                    <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors lowercase">
                      {branch.localized_slug}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Callout "antes de leer" */}
          {article.relations.prerequisite && article.relations.prerequisite.length > 0 && (
            <div className="mb-8 p-4 border border-outline-variant bg-surface-container rounded-md font-mono">
              <p className="text-xs font-bold text-on-surface-variant mb-2">
                // {isEs ? 'antes de leer' : 'before reading'}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {article.relations.prerequisite.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                    className="text-[13.5px] text-primary hover:underline"
                  >
                    → {rel.localized_slug}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cuerpo del artículo */}
          <ArticleRenderer html={bodyHtml} className="article-prose" />
          <MermaidLoader />
          <CodeCopyEnhancer />

          {/* Artículos relacionados */}
          {article.relations.related && article.relations.related.length > 0 && (
            <section className="mt-12 pt-6 border-t border-outline-variant font-mono">
              <p className="text-[12.5px] text-on-surface-variant mb-3">
                // {isEs ? 'relacionados' : 'related'}
              </p>
              <div className="border border-outline-variant bg-surface-container-lowest dark:bg-surface-container rounded-md overflow-hidden">
                {article.relations.related.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                    className="group flex items-center gap-3 px-4 py-3 border-b border-outline-variant last:border-b-0 hover:bg-surface-container transition-colors"
                  >
                    <span className="text-primary">→</span>
                    <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors lowercase">
                      {rel.localized_slug}
                    </span>
                    <span className="ml-auto text-[11px] text-on-surface-variant">{rel.category}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Siguiente artículo */}
          {article.relations.next && article.relations.next.length > 0 && (
            <div className="mt-8 font-mono">
              {article.relations.next.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                  className="group flex items-center justify-between gap-4 px-5 py-5 border-t-2 border-outline bg-primary-container/40 hover:bg-primary-container/70 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-wide text-primary mb-1">
                      // {isEs ? 'siguiente' : 'next'}
                    </p>
                    <p className="font-bold text-base text-on-surface lowercase truncate">
                      {rel.localized_slug}
                    </p>
                  </div>
                  <span className="text-xl text-primary flex-shrink-0">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <SidebarRight toc={toc} resources={article.resources} lang={lang} />
      <Footer />
    </>
  );
}
