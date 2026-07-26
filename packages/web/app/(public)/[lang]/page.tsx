// Homepage por idioma — hero, EMPIEZA POR AQUÍ (filas), EXPLORA POR TEMA (grid)
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { Footer } from '@/components/layout/Footer';
import { SearchBar } from '@/components/search/SearchBar';
import { Icon } from '@/components/ui/Icon';
import { getCategories, getFeatured } from '@/lib/api-client';
import { isValidLang, getCategoryDescription, type SupportedLang } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const isEs = lang === 'es';

  return {
    title: isEs
      ? 'AI Hub — Conocimiento práctico sobre IA generativa'
      : 'AI Hub — Practical AI Knowledge',
    description: isEs
      ? 'Referencia práctica sobre IA generativa para desarrolladores y builders.'
      : 'Practical generative AI reference for developers and builders.',
    alternates: {
      canonical: `/${lang}`,
      languages: {
        es: '/es',
        en: '/en',
      },
    },
    openGraph: {
      type: 'website',
      title: 'AI Hub',
      description: isEs
        ? 'Conocimiento práctico sobre IA generativa'
        : 'Practical generative AI knowledge',
    },
  };
}

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;

  if (!isValidLang(lang)) notFound();

  const validLang = lang as SupportedLang;
  const isEs = validLang === 'es';

  const [categories, featured] = await Promise.all([
    getCategories(validLang),
    getFeatured(validLang, 6),
  ]);

  return (
    <>
      <Navbar lang={validLang} currentPath={`/${lang}`} />

      <div className="mx-auto max-w-[1220px] flex items-start">
        <SidebarLeft lang={validLang} categories={categories} />

        <main className="flex-1 min-w-0 px-6 sm:px-11 pb-16">
          {/* Hero */}
          <section className="pt-14 pb-12">
            <p className="font-mono text-[12px] font-medium tracking-[0.12em] text-primary-text mb-6">
              {isEs
                ? 'CONCEPTOS · PATRONES · HERRAMIENTAS'
                : 'CONCEPTS · PATTERNS · TOOLS'}
            </p>

            <h1 className="font-headline font-semibold text-[44px] sm:text-[56px] leading-[1.04] tracking-[-0.03em] text-on-surface mb-5 max-w-[15ch]">
              {isEs
                ? 'Entiende la IA generativa, sin ruido.'
                : 'Understand generative AI, without the noise.'}
            </h1>

            <p className="font-body text-[18px] sm:text-[19px] leading-[1.55] text-on-surface-variant max-w-[52ch] mb-7">
              {isEs
                ? 'Guías claras y curadas: de los fundamentos a los agentes. Pensadas para leer y entender, estés empezando o construyendo.'
                : 'Clear, curated guides: from the basics to agents. Made to read and understand, whether you are starting or building.'}
            </p>

            <div className="max-w-[520px]">
              <SearchBar lang={validLang} variant="hero" />
            </div>
          </section>

          {/* Empieza por aquí */}
          {featured.length > 0 && (
            <section className="border-t border-outline-variant pt-8 pb-12">
              <header className="mb-6">
                <h2 className="font-mono text-[12.5px] font-semibold tracking-[0.1em] text-on-surface-variant">
                  {isEs ? 'EMPIEZA POR AQUÍ' : 'START HERE'}
                </h2>
              </header>
              <div className="flex flex-col">
                {featured.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/${lang}/${article.category}/${article.localized_slug}`}
                    className="group grid grid-cols-[48px_minmax(0,1fr)_auto] gap-5 sm:gap-6 items-center py-5 sm:py-6 border-b border-outline-variant first:border-t hover:bg-surface-container transition-colors -mx-3 px-3"
                  >
                    <span className="font-mono text-[14px] font-medium text-primary-text">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="font-mono text-[10.5px] font-medium tracking-[0.09em] text-on-surface-variant">
                          {article.category.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-headline font-semibold text-[19px] sm:text-[23px] leading-[1.15] tracking-[-0.02em] text-on-surface mb-1.5">
                        {article.title}
                      </h3>
                      <p className="font-body text-[14px] leading-[1.5] text-on-surface-variant max-w-[60ch] line-clamp-2">
                        {article.summary}
                      </p>
                    </div>
                    <Icon
                      name="arrow_forward"
                      className="text-[22px] text-on-surface-variant group-hover:text-primary-text transition-colors"
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Explora por tema */}
          <section className="pt-2">
            <h2 className="font-mono text-[12.5px] font-semibold tracking-[0.1em] text-on-surface-variant mb-5">
              {isEs ? 'EXPLORA POR TEMA' : 'BROWSE BY TOPIC'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-outline-variant border border-outline-variant">
              {categories.map((category, index) => {
                const description =
                  getCategoryDescription(category.slug, validLang) || category.name;
                return (
                  <Link
                    key={category.slug}
                    href={`/${lang}/${category.slug}`}
                    className="group flex flex-col p-5 sm:p-6 bg-surface min-h-[128px] hover:bg-surface-container transition-colors"
                  >
                    <div className="flex items-baseline justify-between mb-auto">
                      <span className="font-mono text-[12px] font-medium text-primary-text">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-[11px] text-on-surface-variant">
                        {category.article_count > 0
                          ? `${category.article_count} ${isEs ? (category.article_count === 1 ? 'artículo' : 'artículos') : (category.article_count === 1 ? 'article' : 'articles')}`
                          : isEs
                            ? 'Próximamente'
                            : 'Coming soon'}
                      </span>
                    </div>
                    <h3 className="font-headline font-semibold text-[19px] tracking-[-0.02em] text-on-surface mt-4 mb-1.5">
                      {category.name}
                    </h3>
                    <p className="font-body text-[13px] leading-[1.45] text-on-surface-variant line-clamp-2">
                      {description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}
