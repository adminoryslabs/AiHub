// Sidebar izquierda persistente — Categorías, Aprende por nivel, Comunidad
'use client';

import Link from 'next/link';
import type { Category } from '@ai-hub/shared';
import type { SupportedLang } from '@/lib/i18n';
import { DIFFICULTY_LABELS_ES, DIFFICULTY_LABELS_EN } from '@/lib/i18n';
import { CommunityCard } from './CommunityCard';

interface SidebarLeftProps {
  lang: SupportedLang;
  categories: Category[];
  currentCategory?: string;
  currentTutorialDifficulty?: string;
}

// Colores de punto para "Aprende por nivel" — coinciden con la escala del brandbook
const LEVEL_DOT: Record<string, string> = {
  beginner: '#3f8f2e',
  intermediate: '#c08a1e',
  advanced: '#8a5cc0',
};

export function SidebarLeft({
  lang,
  categories,
  currentCategory,
  currentTutorialDifficulty,
}: SidebarLeftProps) {
  const isEs = lang === 'es';
  const difficultyLabels = isEs ? DIFFICULTY_LABELS_ES : DIFFICULTY_LABELS_EN;

  return (
    <aside
      className="hidden md:flex flex-col w-[248px] flex-shrink-0 sticky top-[58px] self-start max-h-[calc(100vh-58px)] overflow-y-auto border-r border-outline-variant py-6 px-4"
      aria-label="Navegación principal"
    >
      {/* Categorías */}
      <p className="font-mono text-[10.5px] font-semibold tracking-[0.12em] text-on-surface-variant px-2.5 mb-2.5">
        {isEs ? 'CATEGORÍAS' : 'CATEGORIES'}
      </p>
      <nav className="flex flex-col" aria-label="Categorías">
        {categories.map((category) => {
          const isActive = category.slug === currentCategory;
          return (
            <Link
              key={category.slug}
              href={`/${lang}/${category.slug}`}
              className={`
                group flex items-center gap-2.5 px-2.5 py-2 text-[14px] transition-colors
                ${
                  isActive
                    ? 'bg-primary-container text-primary-text font-semibold'
                    : 'text-on-surface hover:bg-surface-container'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="flex-1 truncate">{category.name}</span>
              <span className="font-mono text-[11.5px] opacity-70 flex-shrink-0">
                {category.article_count > 0 ? category.article_count : '—'}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Aprende por nivel */}
      <p className="font-mono text-[10.5px] font-semibold tracking-[0.12em] text-on-surface-variant px-2.5 mt-6 mb-2.5">
        {isEs ? 'APRENDE POR NIVEL' : 'LEARN BY LEVEL'}
      </p>
      <nav className="flex flex-col" aria-label={isEs ? 'Aprende por nivel' : 'Learn by level'}>
        {(['beginner', 'intermediate', 'advanced'] as const).map((d) => {
          const isActive = currentTutorialDifficulty === d;
          return (
            <Link
              key={d}
              href={`/${lang}/tutoriales?difficulty=${d}`}
              className={`
                flex items-center gap-2.5 px-2.5 py-2 text-[14px] transition-colors
                ${isActive
                  ? 'bg-primary-container text-primary-text font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: LEVEL_DOT[d] }}
                aria-hidden="true"
              />
              <span>{difficultyLabels[d]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Comunidad — empujada al fondo */}
      <div className="mt-auto pt-6">
        <CommunityCard lang={lang} />
      </div>
    </aside>
  );
}
