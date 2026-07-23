// Renderizador de tutoriales — badges de dificultad/tiempo, pasos numerados, troubleshooting colapsable
'use client';

import { ArticleRenderer } from './ArticleRenderer';
import { DIFFICULTY_LABELS_ES, DIFFICULTY_LABELS_EN } from '@/lib/i18n';

interface TutorialRendererProps {
  title: string;
  summary: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  applicableAsOf: string | null;
  html: string;
  updatedMonth: string;
  slug: string;
  lang: string;
}

export function TutorialRenderer({
  difficulty,
  estimatedTime,
  applicableAsOf,
  html,
  updatedMonth,
  lang,
}: TutorialRendererProps) {
  const isEs = lang === 'es';
  const difficultyLabels = isEs ? DIFFICULTY_LABELS_ES : DIFFICULTY_LABELS_EN;
  const difficultyLabel = difficultyLabels[difficulty] || difficulty;

  return (
    <div className="tutorial-content">
      {/* Badges del tutorial */}
      <div className="flex flex-wrap items-center gap-2 mb-6 font-mono">
        <span className="inline-flex items-center font-mono text-[11px] tracking-wide rounded-sm bg-primary text-on-primary px-1.5 py-0.5">
          [{difficultyLabel}]
        </span>
        <span className="inline-flex items-center font-mono text-[11px] tracking-wide rounded-sm border border-outline-variant text-on-surface-variant px-1.5 py-0.5">
          [~{estimatedTime}]
        </span>
        {applicableAsOf && (
          <span className="inline-flex items-center font-mono text-[11px] tracking-wide rounded-sm border border-outline-variant text-on-surface-variant px-1.5 py-0.5">
            [v {applicableAsOf}]
          </span>
        )}
        <span className="text-[12px] text-on-surface-variant ml-2">
          <span className="text-primary">●</span> updated {updatedMonth}
        </span>
      </div>

      {/* Cuerpo del tutorial (markdown procesado) */}
      <ArticleRenderer html={html} className="tutorial-prose" />
    </div>
  );
}
