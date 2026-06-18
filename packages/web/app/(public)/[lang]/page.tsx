// Homepage por idioma: hero terminal + destacados + categorías
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { Footer } from '@/components/layout/Footer';
import { SearchBar } from '@/components/search/SearchBar';
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

  // Cargar datos en paralelo
  const [categories, featured] = await Promise.all([
    getCategories(validLang),
    getFeatured(validLang, 6),
  ]);

  const totalConcepts = categories.reduce((acc, c) => acc + c.article_count, 0);
  const updatedMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  return (
    <>
      <Navbar lang={validLang} currentPath={`/${lang}`} />
      <SidebarLeft lang={validLang} categories={categories} />

      {/* Contenido principal */}
      <main className="pt-24 pb-16 md:pl-72 px-6 min-h-screen">
        <div className="max-w-4xl mx-auto font-mono">
          {/* Hero */}
          <section className="mb-12">
            <p className="text-primary text-xs tracking-wide mb-4">
              // {isEs ? 'REFERENCIA · IA GENERATIVA · CURADA' : 'REFERENCE · GENERATIVE AI · CURATED'}
            </p>

            <h1 className="font-mono font-bold text-[44px] sm:text-[46px] leading-[1.1] tracking-tight text-on-surface mb-4">
              {isEs ? 'Tu referencia sobre' : 'Your reference for'}
              <br />
              <span className="text-primary">
                {isEs ? 'IA generativa' : 'Generative AI'}
              </span>
              <span
                className="blink-cursor inline-block w-5 h-[38px] bg-primary ml-2 align-middle"
                aria-hidden="true"
              />
            </h1>

            <p className="font-body text-base leading-relaxed text-on-surface-variant max-w-2xl mb-6">
              {isEs
                ? 'Conceptos, patrones y herramientas. Bilingüe, enciclopédico, orientado a developers. Sin humo, sin noticias — solo lo que necesitas para construir.'
                : 'Concepts, patterns and tools. Bilingual, encyclopedic, developer-oriented. No fluff, no news — just what you need to build.'}
            </p>

            {/* Prompt de búsqueda grande */}
            <div className="max-w-[580px]">
              <SearchBar lang={validLang} variant="hero" />
            </div>

            <p className="text-[12.5px] text-on-surface-variant mt-4">
              {totalConcepts} {isEs ? 'conceptos' : 'concepts'} · {categories.length}{' '}
              {isEs ? 'categorías' : 'categories'} ·{' '}
              <span className="text-primary">●</span> updated {updatedMonth}
            </p>
          </section>

          {/* Destacados */}
          {featured.length > 0 && (
            <section className="mb-12">
              <p className="text-[13.5px] text-on-surface mb-4">
                <span className="text-primary">$</span> hub ls --featured
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {featured.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/${lang}/${article.category}/${article.localized_slug}`}
                    className="group flex flex-col p-5 border border-outline-variant bg-surface-container-lowest dark:bg-surface-container rounded-md hover:border-primary/50 transition-colors min-h-[184px]"
                  >
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-primary font-bold text-[13px]">
                        FIG. {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">{article.category}</span>
                    </div>
                    <h3 className="font-mono font-bold text-[15px] leading-snug text-on-surface mb-2">
                      {article.title}
                    </h3>
                    <p className="font-body text-[13px] leading-relaxed text-on-surface-variant">
                      {article.summary}
                    </p>
                    <span className="mt-auto pt-3.5 text-[12.5px] text-primary group-hover:underline">
                      {isEs ? 'read →' : 'read →'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Categorías */}
          <section>
            <p className="text-[13.5px] text-on-surface mb-4">
              <span className="text-primary">$</span> hub ls {isEs ? 'categorías/' : 'categories/'}
            </p>
            <div className="border border-outline-variant bg-surface-container-lowest dark:bg-surface-container rounded-md overflow-hidden">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/${lang}/${category.slug}`}
                  className="group flex items-center gap-4 px-4 py-3.5 border-b border-outline-variant last:border-b-0 hover:bg-surface-container transition-colors"
                >
                  <span className="text-primary text-[12px] w-10 flex-shrink-0">[dir]</span>
                  <span className="font-mono font-bold text-[14px] text-on-surface w-[120px] flex-shrink-0 lowercase">
                    {category.slug}
                  </span>
                  <span className="font-body text-[13px] text-on-surface-variant flex-1 min-w-0 truncate">
                    {getCategoryDescription(category.slug, validLang) || category.name}
                  </span>
                  <span className="text-[12px] text-on-surface-variant flex-shrink-0">
                    {category.article_count > 0
                      ? `${category.article_count} ${isEs ? 'art.' : 'art.'}`
                      : isEs ? 'Próximamente' : 'Coming soon'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
