// Sidebar izquierda — árbol de categorías estilo terminal
'use client';

import Link from 'next/link';
import type { Category } from '@ai-hub/shared';
import type { SupportedLang } from '@/lib/i18n';

interface SidebarLeftProps {
  lang: SupportedLang;
  categories: Category[];
  currentCategory?: string;
}

export function SidebarLeft({ lang, categories, currentCategory }: SidebarLeftProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 fixed left-0 top-[58px] h-[calc(100vh-58px)] bg-surface border-r border-outline-variant overflow-y-auto z-40 font-mono">
      <p className="px-3 pt-5 pb-3 text-[11px] font-bold tracking-wide text-on-surface-variant">
        ~/categorías
      </p>

      <nav className="flex flex-col gap-px px-2" aria-label="Categorías">
        {categories.map((category) => {
          const isActive = category.slug === currentCategory;
          return (
            <Link
              key={category.slug}
              href={`/${lang}/${category.slug}`}
              className={`
                flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-[13px] transition-colors
                ${
                  isActive
                    ? 'bg-primary-container text-on-surface font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={`w-3 text-center flex-shrink-0 ${isActive ? 'text-primary' : 'text-on-surface-variant/60'}`}
                aria-hidden="true"
              >
                {isActive ? '▸' : '·'}
              </span>
              <span className="lowercase">{category.slug}</span>
              <span className="ml-auto text-[12px] text-on-surface-variant/60">
                [{category.article_count}]
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Pie del sidebar */}
      <div className="mt-auto px-2 pt-3 pb-5 border-t border-outline-variant">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-[13px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          <span aria-hidden="true">›</span>
          <span>admin</span>
        </Link>
      </div>
    </aside>
  );
}
