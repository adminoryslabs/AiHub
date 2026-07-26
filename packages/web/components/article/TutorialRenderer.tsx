// Renderizador de tutoriales — badges de dificultad/tiempo + cuerpo del artículo
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
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="inline-flex items-center font-mono text-[10.5px] font-medium tracking-[0.06em] bg-primary text-on-primary px-2 py-0.5">
          {difficultyLabel}
        </span>
        <span className="inline-flex items-center font-mono text-[10.5px] font-medium tracking-[0.06em] border border-outline-variant text-on-surface-variant px-2 py-0.5">
          ~{estimatedTime}
        </span>
        {applicableAsOf && (
          <span className="inline-flex items-center font-mono text-[10.5px] font-medium tracking-[0.06em] border border-outline-variant text-on-surface-variant px-2 py-0.5">
            v {applicableAsOf}
          </span>
        )}
        <span className="font-mono text-[12px] text-on-surface-variant ml-1">
          {isEs ? 'actualizado' : 'updated'} {updatedMonth}
        </span>
      </div>

      <ArticleRenderer html={html} className="tutorial-prose" />
    </div>
  );
}
