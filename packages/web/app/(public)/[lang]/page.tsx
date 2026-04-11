// Homepage por idioma: categorías + artículos destacados
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { Footer } from '@/components/layout/Footer';
import { Icon } from '@/components/ui/Icon';
import { getCategories, getFeatured } from '@/lib/api-client';
import { isValidLang, getCategoryIcon, type SupportedLang } from '@/lib/i18n';

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
        : 'Practical AI generative knowledge',
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

  return (
    <>
      <Navbar lang={validLang} currentPath={`/${lang}`} />
      <SidebarLeft lang={validLang} categories={categories} />

      {/* Contenido principal */}
      <main className="pt-24 pb-16 md:pl-72 px-6 min-h-screen">
        <div className="max-w-4xl mx-auto">

          {/* Hero */}
          <section className="mb-16">
            <h1 className="font-headline text-5xl font-extrabold text-on-surface leading-tight mb-4">
              {isEs ? (
                <>Tu referencia sobre<br /><span className="text-primary">IA generativa</span></>
              ) : (
                <>Your reference for<br /><span className="text-primary">Generative AI</span></>
              )}
            </h1>
            <p className="text-lg text-on-surface-variant max-w-2xl">
              {isEs
                ? 'Conceptos, patrones y herramientas. Bilingüe, enciclopédico, orientado a developers.'
                : 'Concepts, patterns and tools. Bilingual, encyclopedic, developer-oriented.'}
            </p>
          </section>

          {/* Categorías */}
          <section className="mb-16">
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-6">
              {isEs ? 'Explorar por categoría' : 'Explore by category'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/${lang}/${category.slug}`}
                  className="group p-8 bg-surface-container-lowest dark:bg-surface-container border border-outline-variant/5 rounded-2xl hover:shadow-2xl hover:shadow-primary/5 hover:bg-white transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                    <Icon name={getCategoryIcon(category.slug)} size="lg" />
                  </div>
                  <h3 className="font-headline font-bold text-on-surface mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    {category.article_count > 0
                      ? `${category.article_count} ${isEs ? 'artículos' : 'articles'}`
                      : isEs ? 'Sin artículos aún' : 'No articles yet'}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Artículos destacados */}
          {featured.length > 0 && (
            <section>
              <h2 className="font-headline text-2xl font-bold text-on-surface mb-6">
                {isEs ? 'Conceptos destacados' : 'Featured concepts'}
              </h2>
              <div className="space-y-3 bg-surface-container-low p-1 rounded-2xl">
                {featured.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/${lang}/${article.category}/${article.localized_slug}`}
                    className="group block bg-white dark:bg-surface-container p-6 rounded-xl hover:bg-primary-container/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-outline-variant w-8 flex-shrink-0">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-headline font-semibold text-on-surface group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-on-surface-variant mt-1 line-clamp-1">
                          {article.summary}
                        </p>
                      </div>
                      <Icon
                        name="chevron_right"
                        className="text-on-surface-variant flex-shrink-0 group-hover:translate-x-2 transition-transform"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
