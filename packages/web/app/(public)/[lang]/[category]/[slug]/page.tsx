// Página de artículo completo con SSR
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
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { getCategories, getArticle, ApiClientError } from '@/lib/api-client';
import { markdownToHtml, extractToc } from '@/lib/markdown';
import { isValidLang, type SupportedLang } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ lang: string; category: string; slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihub.example.com';

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

  return (
    <>
      <Navbar lang={validLang} currentPath={currentPath} alternateUrl={article.alternate_lang?.url} />
      <SidebarLeft lang={validLang} categories={categories} currentCategory={category} />

      <main className="pt-24 pb-16 md:pl-72 xl:pr-[320px] px-6 min-h-screen">
        <div className="max-w-4xl mx-auto">

          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-2 text-sm text-on-surface-variant mb-8"
            aria-label="Breadcrumb"
          >
            <Link href={`/${lang}`} className="hover:text-primary transition-colors">
              {isEs ? 'Inicio' : 'Home'}
            </Link>
            <Icon name="chevron_right" size="sm" />
            <Link
              href={`/${lang}/${category}`}
              className="hover:text-primary transition-colors capitalize"
            >
              {categories.find((c) => c.slug === category)?.name || category}
            </Link>
            <Icon name="chevron_right" size="sm" />
            <span className="text-on-surface truncate max-w-[200px]">{article.title}</span>
          </nav>

          {/* Header del artículo */}
          <header className="mb-12">
            {/* Badges de metadata */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant={article.type === 'concept' ? 'primary' : 'outline'}>
                {article.type === 'concept'
                  ? isEs ? 'Concepto' : 'Concept'
                  : isEs ? 'Herramienta' : 'Tool'}
              </Badge>
              <Badge variant="muted">{article.volatility}</Badge>
              {article.applicable_as_of && (
                <Badge variant="outline">v{article.applicable_as_of}</Badge>
              )}
            </div>

            <h1 className="font-headline text-4xl sm:text-5xl font-extrabold text-on-surface leading-tight mb-4">
              {article.title}
            </h1>

            <p className="text-lg text-on-surface-variant leading-relaxed">
              {article.summary}
            </p>

            {/* Enlace al idioma alternativo */}
            {article.alternate_lang && (
              <div className="mt-4">
                <Link
                  href={article.alternate_lang.url}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Icon name="language" size="sm" />
                  {isEs ? 'Read in English' : 'Leer en español'}
                  <Icon name="arrow_forward" size="sm" />
                </Link>
              </div>
            )}
          </header>

          {/* Ramas (tool-branches) del concepto */}
          {article.tool_branches && article.tool_branches.length > 0 && (
            <section className="mb-12 p-6 bg-surface-container-low rounded-2xl">
              <h2 className="font-headline text-lg font-bold text-on-surface mb-4">
                {isEs ? 'Implementaciones específicas' : 'Specific implementations'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {article.tool_branches.map((branch) => (
                  <Link
                    key={branch.id}
                    href={`/${lang}/${branch.category}/${branch.localized_slug}`}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-surface-container rounded-xl hover:bg-primary-container/20 transition-colors group"
                  >
                    <Icon name="construction" size="sm" className="text-primary" />
                    <span className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">
                      {branch.title}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Prerrequisitos */}
          {article.relations.prerequisite && article.relations.prerequisite.length > 0 && (
            <div className="mb-8 p-4 border border-outline-variant/20 rounded-xl bg-surface-container-low">
              <p className="text-sm font-semibold text-on-surface-variant mb-2">
                {isEs ? 'Antes de leer este artículo:' : 'Before reading this article:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {article.relations.prerequisite.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {rel.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cuerpo del artículo */}
          <ArticleRenderer html={bodyHtml} />
          <MermaidLoader />
          <CodeCopyEnhancer />

          {/* Artículos relacionados */}
          {article.relations.related && article.relations.related.length > 0 && (
            <section className="mt-16 pt-8 border-t border-outline-variant/20">
              <h2 className="font-headline text-xl font-bold text-on-surface mb-4">
                {isEs ? 'Artículos relacionados' : 'Related articles'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {article.relations.related.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                    className="p-4 bg-surface-container-low rounded-xl hover:bg-surface-container transition-colors"
                  >
                    <p className="font-semibold text-on-surface text-sm">{rel.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{rel.category}</p>
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
                  className="flex items-center justify-between p-6 bg-primary/5 border border-primary/20 rounded-2xl hover:bg-primary/10 transition-colors group"
                >
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                      {isEs ? 'Siguiente' : 'Next'}
                    </p>
                    <p className="font-headline font-bold text-on-surface">{rel.title}</p>
                  </div>
                  <Icon
                    name="arrow_forward"
                    className="text-primary group-hover:translate-x-1 transition-transform"
                    size="lg"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <SidebarRight toc={toc} resources={article.resources} />
      <Footer />
    </>
  );
}
