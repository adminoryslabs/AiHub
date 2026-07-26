// Página de listado de tutoriales — filas con badges de dificultad y tiempo
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { Footer } from '@/components/layout/Footer';
import { Icon } from '@/components/ui/Icon';
import { getCategories, getTutorials, ApiClientError } from '@/lib/api-client';
import { isValidLang, type SupportedLang, DIFFICULTY_LABELS_ES, DIFFICULTY_LABELS_EN } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ difficulty?: string; page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidLang(lang)) return {};

  const isEs = lang === 'es';
  const title = isEs ? 'Tutoriales' : 'Tutorials';
  const description = isEs
    ? 'Guías prácticas paso a paso sobre IA generativa.'
    : 'Step-by-step practical guides on generative AI.';

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/tutoriales`,
      languages: {
        es: '/es/tutoriales',
        en: '/en/tutorials',
      },
    },
  };
}

export default async function TutorialsListPage({ params, searchParams }: PageProps) {
  const { lang } = await params;
  const { difficulty, page } = await searchParams;

  if (!isValidLang(lang)) notFound();

  const validLang = lang as SupportedLang;
  const isEs = validLang === 'es';
  const difficultyLabels = isEs ? DIFFICULTY_LABELS_ES : DIFFICULTY_LABELS_EN;

  let categories;
  let tutorials;

  try {
    [categories, tutorials] = await Promise.all([
      getCategories(validLang),
      getTutorials({
        lang: validLang,
        difficulty: difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : undefined,
        page: page ? parseInt(page, 10) : undefined,
      }),
    ]);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <>
      <Navbar lang={validLang} currentPath={`/${lang}/tutoriales`} />

      <div className="mx-auto max-w-[1220px] flex items-start">
        <SidebarLeft
          lang={validLang}
          categories={categories}
          currentTutorialDifficulty={difficulty}
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
              <span className="text-on-surface">
                {isEs ? 'Tutoriales' : 'Tutorials'}
              </span>
            </nav>

            <header className="pt-5 pb-6 border-b border-outline">
              <div className="flex items-baseline gap-3.5 mb-3.5">
                <h1 className="font-headline font-semibold text-[40px] sm:text-[48px] leading-[1] tracking-[-0.03em] text-on-surface">
                  {isEs ? 'Tutoriales' : 'Tutorials'}
                </h1>
                <span className="font-mono text-[13px] text-on-surface-variant">
                  {tutorials.pagination.total}{' '}
                  {isEs
                    ? tutorials.pagination.total === 1
                      ? 'tutorial'
                      : 'tutoriales'
                    : 'tutorials'}
                </span>
              </div>
              <p className="font-body text-[18px] leading-[1.5] text-on-surface-variant max-w-[54ch]">
                {isEs
                  ? 'Guías prácticas paso a paso con un resultado específico y verificable.'
                  : 'Step-by-step practical guides with a specific, verifiable outcome.'}
              </p>
            </header>

            {/* Filtro por dificultad */}
            <div className="flex flex-wrap items-center gap-2 mt-6 mb-2">
              <Link
                href={`/${lang}/tutoriales`}
                className={`font-mono text-[12px] font-medium px-2.5 py-1 transition-colors ${
                  !difficulty
                    ? 'bg-primary-container text-primary-text'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {isEs ? 'Todos' : 'All'}
              </Link>
              {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                <Link
                  key={d}
                  href={`/${lang}/tutoriales?difficulty=${d}`}
                  className={`font-mono text-[12px] font-medium px-2.5 py-1 transition-colors ${
                    difficulty === d
                      ? 'bg-primary-container text-primary-text'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {difficultyLabels[d]}
                </Link>
              ))}
            </div>

            {/* Lista de tutoriales */}
            {tutorials.data.length > 0 ? (
              <div className="flex flex-col">
                {tutorials.data.map((tutorial, index) => (
                  <Link
                    key={tutorial.id}
                    href={`/${lang}/tutoriales/${tutorial.localized_slug}`}
                    className="group grid grid-cols-[48px_minmax(0,1fr)_auto] gap-5 sm:gap-6 items-center py-6 border-b border-outline-variant hover:bg-surface-container transition-colors -mx-3 px-3"
                  >
                    <span className="font-mono text-[14px] font-medium text-primary-text">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-[10.5px] font-medium tracking-[0.06em] bg-primary text-on-primary px-2 py-0.5">
                          Tutorial
                        </span>
                        <span className="font-mono text-[10.5px] font-medium tracking-[0.06em] border border-outline-variant text-on-surface-variant px-2 py-0.5">
                          {difficultyLabels[tutorial.difficulty] || tutorial.difficulty}
                        </span>
                        {tutorial.estimated_time && (
                          <span className="font-mono text-[10.5px] font-medium tracking-[0.06em] border border-outline-variant text-on-surface-variant px-2 py-0.5">
                            ~{tutorial.estimated_time}
                          </span>
                        )}
                      </div>
                      <h2 className="font-headline font-semibold text-[20px] sm:text-[22px] leading-[1.15] tracking-[-0.02em] text-on-surface mb-1.5">
                        {tutorial.title}
                      </h2>
                      <p className="font-body text-[14px] leading-[1.5] text-on-surface-variant max-w-[62ch] line-clamp-2">
                        {tutorial.summary}
                      </p>
                    </div>
                    <Icon
                      name="arrow_forward"
                      className="text-[22px] text-on-surface-variant group-hover:text-primary-text transition-colors"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="font-body text-[15px] text-on-surface-variant">
                  {isEs
                    ? 'Sin tutoriales para este filtro.'
                    : 'No tutorials for this filter.'}
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
