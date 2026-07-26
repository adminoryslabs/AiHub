// Página de artículo completo con SSR — kicker + meta entre bordes + TOC derecho
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { SidebarRight } from '@/components/layout/SidebarRight';
import { Footer } from '@/components/layout/Footer';
import { Icon } from '@/components/ui/Icon';
import { ArticleRenderer } from '@/components/article/ArticleRenderer';
import { MermaidLoader } from '@/components/article/MermaidLoader';
import { CodeCopyEnhancer } from '@/components/article/CodeCopyEnhancer';
import { getCategories, getArticle, ApiClientError } from '@/lib/api-client';
import { markdownToHtml, extractToc } from '@/lib/markdown';
import { isValidLang, type SupportedLang } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ lang: string; category: string; slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihub.example.com';

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

  const bodyHtml = await markdownToHtml(article.body);
  const toc = extractToc(article.body);

  const currentPath = `/${lang}/${category}/${slug}`;
  const readMin = readingMinutes(article.body);
  const updatedMonth = article.last_edited_at?.slice(0, 7) ?? '—';

  const typeLabel = isEs
    ? article.type === 'tutorial' ? 'Concepto' : 'Concepto'
    : article.type === 'tutorial' ? 'Concept' : 'Concept';
  const categoryUpper = category.toUpperCase();

  return (
    <>
      <Navbar lang={validLang} currentPath={currentPath} alternateUrl={article.alternate_lang?.url} />

      <div className="mx-auto max-w-[1220px] flex items-start">
        <SidebarLeft
          lang={validLang}
          categories={categories}
          currentCategory={category}
        />

        <main className="flex-1 min-w-0 px-6 sm:px-11 pb-16">
          <div className="flex gap-8 xl:gap-11 items-start">
            <article className="flex-1 min-w-0 max-w-[760px]">
              {/* Breadcrumb */}
              <nav
                className="font-mono text-[12px] text-on-surface-variant pt-10 mb-5"
                aria-label="Breadcrumb"
              >
                <Link
                  href={`/${lang}`}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {isEs ? 'Inicio' : 'Home'}
                </Link>
                <span className="mx-2 text-outline-variant">/</span>
                <Link
                  href={`/${lang}/${category}`}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {category}
                </Link>
                <span className="mx-2 text-outline-variant">/</span>
                <span className="text-on-surface">{article.title}</span>
              </nav>

              {/* Header del artículo */}
              <header className="mb-7">
                <p className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-primary-text mb-4">
                  {typeLabel.toUpperCase()} · {categoryUpper}
                </p>

                <h1 className="font-headline font-semibold text-[36px] sm:text-[48px] leading-[1.03] tracking-[-0.03em] text-on-surface mb-5">
                  {article.title}
                </h1>

                <p className="font-body text-[19px] sm:text-[20px] leading-[1.55] text-on-surface-variant max-w-[56ch] mb-5">
                  {article.summary}
                </p>

                <p className="font-mono text-[12px] text-on-surface-variant py-3.5 border-y border-outline-variant">
                  {article.estimated_time
                    ? `${article.estimated_time} · `
                    : `${readMin} ${isEs ? 'min de lectura' : 'min read'} · `}
                  {isEs ? 'actualizado' : 'updated'} {updatedMonth}
                </p>
              </header>

              {/* Prerrequisitos */}
              {article.relations.prerequisite && article.relations.prerequisite.length > 0 && (
                <div className="mb-8 p-4 border border-outline-variant bg-surface-container">
                  <p className="font-mono text-[10.5px] font-semibold tracking-[0.1em] text-on-surface-variant mb-2.5">
                    {isEs ? 'ANTES DE LEER' : 'BEFORE READING'}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {article.relations.prerequisite.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                        className="text-[14px] text-primary-text hover:underline font-medium"
                      >
                        {rel.title}
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
                <section className="mt-14 pt-6 border-t border-outline-variant">
                  <h2 className="font-mono text-[12.5px] font-semibold tracking-[0.1em] text-on-surface-variant mb-4">
                    {isEs ? 'RELACIONADOS' : 'RELATED'}
                  </h2>
                  <div className="flex flex-col">
                    {article.relations.related.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                        className="group flex items-center gap-3 py-3 border-b border-outline-variant hover:bg-surface-container transition-colors -mx-3 px-3"
                      >
                        <span className="font-headline font-semibold text-[16px] text-on-surface group-hover:text-primary-text transition-colors flex-1 min-w-0 truncate">
                          {rel.title}
                        </span>
                        <span className="font-mono text-[11px] text-on-surface-variant flex-shrink-0">
                          {rel.category}
                        </span>
                        <Icon
                          name="arrow_forward"
                          className="text-[18px] text-on-surface-variant group-hover:text-primary-text transition-colors"
                        />
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Siguiente artículo */}
              {article.relations.next && article.relations.next.length > 0 && (
                <div className="mt-8">
                  {article.relations.next.map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                      className="group flex items-center justify-between gap-4 px-5 sm:px-6 py-5 border border-outline hover:bg-surface-container transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] font-semibold tracking-[0.1em] text-primary-text mb-1.5">
                          {isEs ? 'SIGUIENTE' : 'NEXT'}
                        </p>
                        <p className="font-headline font-semibold text-[19px] sm:text-[20px] tracking-[-0.02em] text-on-surface truncate">
                          {rel.title}
                        </p>
                      </div>
                      <Icon
                        name="arrow_forward"
                        className="text-[24px] sm:text-[26px] text-on-surface flex-shrink-0 group-hover:text-primary-text transition-colors"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </article>

            <SidebarRight toc={toc} resources={article.resources} lang={lang} />
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
