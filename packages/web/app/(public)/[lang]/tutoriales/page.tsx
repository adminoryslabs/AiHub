// Página de listado de tutoriales — estilo terminal
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarLeft } from '@/components/layout/SidebarLeft';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
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
      <SidebarLeft
        lang={validLang}
        categories={categories}
        currentTutorialDifficulty={difficulty}
      />

      <main className="pt-24 pb-16 md:pl-72 px-6 min-h-screen">
        <div className="max-w-4xl mx-auto font-mono">
          {/* Breadcrumb */}
          <nav className="text-[13px] text-on-surface-variant mb-7" aria-label="Breadcrumb">
            <span className="text-primary">~</span>/{' '}
            <Link href={`/${lang}`} className="hover:text-primary transition-colors">
              {isEs ? 'inicio' : 'home'}
            </Link>{' '}/{' '}
            <span className="text-on-surface lowercase">
              {isEs ? 'tutoriales' : 'tutorials'}
            </span>
          </nav>

          {/* Cabecera */}
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-primary text-[13px]">[dir]</span>
            <h1 className="font-mono font-bold text-[34px] tracking-tight text-on-surface lowercase">
              {isEs ? 'tutoriales' : 'tutorials'}
            </h1>
            <span className="text-[13px] text-on-surface-variant">
              {tutorials.pagination.total} {isEs ? 'tutoriales' : 'tutorials'}
            </span>
          </div>

          <p className="font-body text-sm text-on-surface-variant max-w-2xl mb-6">
            {isEs
              ? 'Guías prácticas paso a paso con un resultado específico y verificable.'
              : 'Step-by-step practical guides with a specific, verifiable outcome.'}
          </p>

          {/* Filtro por dificultad */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[13px] text-on-surface-variant">filter:</span>
            <Link
              href={`/${lang}/tutoriales`}
              className={`text-[13px] px-2 py-0.5 rounded-sm transition-colors ${
                !difficulty ? 'bg-primary-container text-on-surface font-semibold' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {isEs ? 'todos' : 'all'}
            </Link>
            {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
              <Link
                key={d}
                href={`/${lang}/tutoriales?difficulty=${d}`}
                className={`text-[13px] px-2 py-0.5 rounded-sm transition-colors ${
                  difficulty === d ? 'bg-primary-container text-on-surface font-semibold' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {difficultyLabels[d]}
              </Link>
            ))}
          </div>

          {/* Lista de tutoriales */}
          {tutorials.data.length > 0 ? (
            <div className="border border-outline-variant bg-surface-container-lowest dark:bg-surface-container rounded-md overflow-hidden">
              {tutorials.data.map((tutorial) => (
                <Link
                  key={tutorial.id}
                  href={`/${lang}/tutoriales/${tutorial.localized_slug}`}
                  className="group block px-4 py-4 border-b border-outline-variant last:border-b-0 hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-primary">›</span>
                    <Badge variant="primary">tutorial</Badge>
                    <Badge variant="outline">
                      {difficultyLabels[tutorial.difficulty] || tutorial.difficulty}
                    </Badge>
                    <Badge variant="outline">~{tutorial.estimated_time}</Badge>
                    <span className="ml-auto text-[12px] text-on-surface-variant">
                      updated {tutorial.last_edited_at?.slice(0, 7) ?? '—'}
                    </span>
                  </div>
                  <h2 className="font-mono font-bold text-[18px] text-on-surface group-hover:text-primary transition-colors pl-5">
                    {tutorial.title}
                  </h2>
                  <p className="font-body text-[13.5px] leading-relaxed text-on-surface-variant mt-1.5 pl-5">
                    {tutorial.summary}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-outline-variant bg-surface-container-lowest dark:bg-surface-container rounded-md p-10 text-center">
              <p className="font-mono text-sm text-on-surface-variant">
                {isEs ? 'sin tutoriales para este filtro' : 'no tutorials for this filter'}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
