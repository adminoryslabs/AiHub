// Página de detalle de tutorial con SSR — mismo shell que artículo de concepto
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { SidebarRight } from '@/components/layout/SidebarRight';
import { Footer } from '@/components/layout/Footer';
import { Icon } from '@/components/ui/Icon';
import { TutorialRenderer } from '@/components/article/TutorialRenderer';
import { MermaidLoader } from '@/components/article/MermaidLoader';
import { CodeCopyEnhancer } from '@/components/article/CodeCopyEnhancer';
import { getCategories, getTutorial, ApiClientError } from '@/lib/api-client';
import { markdownToHtml, extractToc } from '@/lib/markdown';
import { isValidLang, buildTutorialUrl, type SupportedLang } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihub.example.com';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;

  if (!isValidLang(lang)) return {};

  const validLang = lang as SupportedLang;

  try {
    const article = await getTutorial(slug, validLang);

    const canonical = `${SITE_URL}${buildTutorialUrl(validLang, slug)}`;
    const alternateLangs: Record<string, string> = {
      [lang]: canonical,
    };
    if (article.alternate_lang) {
      const altLang = article.alternate_lang.lang as SupportedLang;
      alternateLangs[altLang] =
        `${SITE_URL}${buildTutorialUrl(altLang, article.alternate_lang.slug)}`;
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

export default async function TutorialPage({ params }: PageProps) {
  const { lang, slug } = await params;

  if (!isValidLang(lang)) notFound();

  const validLang = lang as SupportedLang;
  const isEs = validLang === 'es';

  let article;
  let categories;

  try {
    [article, categories] = await Promise.all([
      getTutorial(slug, validLang),
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

  const currentPath = buildTutorialUrl(validLang, slug);
  const updatedMonth = article.last_edited_at?.slice(0, 7) ?? '—';

  return (
    <>
      <Navbar lang={validLang} currentPath={currentPath} alternateUrl={article.alternate_lang?.url} />

      <div className="mx-auto max-w-[1220px] flex items-start">
        <SidebarLeft lang={validLang} categories={categories} />

        <main className="flex-1 min-w-0 px-6 sm:px-11 pb-16">
          <div className="flex gap-8 xl:gap-11 items-start">
            <article className="flex-1 min-w-0 max-w-[760px]">
              {/* Breadcrumb */}
              <nav
                className="font-orys-mono text-[12px] text-orys-fg-dim pt-10 mb-5"
                aria-label="Breadcrumb"
              >
                <Link
                  href={`/${lang}`}
                  className="text-orys-fg-dim hover:text-orys-fg transition-colors"
                >
                  {isEs ? 'Inicio' : 'Home'}
                </Link>
                <span className="mx-2 text-orys-fg-mute">/</span>
                <Link
                  href={`/${lang}/tutoriales`}
                  className="text-orys-fg-dim hover:text-orys-fg transition-colors"
                >
                  {isEs ? 'Tutoriales' : 'Tutorials'}
                </Link>
                <span className="mx-2 text-orys-fg-mute">/</span>
                <span className="text-orys-fg">{article.title}</span>
              </nav>

              <header className="mb-7">
                <p className="font-orys-mono text-[11.5px] font-medium tracking-[0.1em] text-orys-accent mb-4">
                  TUTORIAL
                </p>

                <h1 className="font-orys-sans font-semibold text-[36px] sm:text-[48px] leading-[1.03] tracking-[-0.03em] text-orys-fg mb-5">
                  {article.title}
                </h1>

                <p className="font-orys-sans text-[19px] sm:text-[20px] leading-[1.55] text-orys-fg-dim max-w-[56ch] mb-5">
                  {article.summary}
                </p>
              </header>

              {/* Prerrequisitos */}
              {article.relations.prerequisite && article.relations.prerequisite.length > 0 && (
                <div className="mb-8 p-4 border border-orys-line bg-orys-bg-raised">
                  <p className="font-orys-mono text-[10.5px] font-semibold tracking-[0.1em] text-orys-fg-dim mb-2.5">
                    {isEs ? 'PRERREQUISITOS' : 'PREREQUISITES'}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                    {article.relations.prerequisite.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                        className="text-[14px] text-orys-accent hover:underline font-medium"
                      >
                        {rel.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <TutorialRenderer
                title={article.title}
                summary={article.summary}
                difficulty={(article.difficulty || 'intermediate') as 'beginner' | 'intermediate' | 'advanced'}
                estimatedTime={article.estimated_time || ''}
                applicableAsOf={article.applicable_as_of}
                html={bodyHtml}
                updatedMonth={updatedMonth}
                slug={slug}
                lang={lang}
              />
              <MermaidLoader />
              <CodeCopyEnhancer />

              {/* Artículos relacionados */}
              {article.relations.related && article.relations.related.length > 0 && (
                <section className="mt-14 pt-6 border-t border-orys-line">
                  <h2 className="font-orys-mono text-[12.5px] font-semibold tracking-[0.1em] text-orys-fg-dim mb-4">
                    {isEs ? 'RELACIONADOS' : 'RELATED'}
                  </h2>
                  <div className="flex flex-col">
                    {article.relations.related.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/${lang}/${rel.category}/${rel.localized_slug}`}
                        className="group flex items-center gap-3 py-3 border-b border-orys-line hover:bg-orys-bg-raised transition-colors -mx-3 px-3"
                      >
                        <span className="font-orys-sans font-semibold text-[16px] text-orys-fg group-hover:text-orys-accent transition-colors flex-1 min-w-0 truncate">
                          {rel.title}
                        </span>
                        <span className="font-orys-mono text-[11px] text-orys-fg-dim flex-shrink-0">
                          {rel.category}
                        </span>
                        <Icon
                          name="arrow_forward"
                          className="text-[18px] text-orys-fg-dim group-hover:text-orys-accent transition-colors"
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
                      className="group flex items-center justify-between gap-4 px-5 sm:px-6 py-5 border border-orys-line-strong hover:bg-orys-bg-raised transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-orys-mono text-[11px] font-semibold tracking-[0.1em] text-orys-accent mb-1.5">
                          {isEs ? 'SIGUIENTE' : 'NEXT'}
                        </p>
                        <p className="font-orys-sans font-semibold text-[19px] sm:text-[20px] tracking-[-0.02em] text-orys-fg truncate">
                          {rel.title}
                        </p>
                      </div>
                      <Icon
                        name="arrow_forward"
                        className="text-[24px] sm:text-[26px] text-orys-fg flex-shrink-0 group-hover:text-orys-accent transition-colors"
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
