// Sidebar izquierda con categorías y navegación
'use client';

import Link from 'next/link';
import { Icon } from '../ui/Icon';
import { getCategoryIcon } from '@/lib/i18n';
import type { Category } from '@ai-hub/shared';
import type { SupportedLang } from '@/lib/i18n';

interface SidebarLeftProps {
  lang: SupportedLang;
  categories: Category[];
  currentCategory?: string;
}

export function SidebarLeft({ lang, categories, currentCategory }: SidebarLeftProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 fixed left-0 top-16 h-[calc(100vh-4rem)] bg-surface/50 dark:bg-inverse-surface/20 backdrop-blur-xl border-r border-outline-variant/15 overflow-y-auto z-40">
      <nav className="p-4 space-y-1" aria-label="Categorías">
        {/* Título de navegación */}
        <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">
          {lang === 'es' ? 'Categorías' : 'Categories'}
        </p>

        {categories.map((category) => {
          const isActive = category.slug === currentCategory;
          const icon = getCategoryIcon(category.slug);

          return (
            <Link
              key={category.slug}
              href={`/${lang}/${category.slug}`}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group
                ${
                  isActive
                    ? 'text-primary font-bold bg-primary/5 border-r-2 border-primary translate-x-0.5'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container dark:hover:bg-surface-container/20'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                name={icon}
                size="sm"
                className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : ''}`}
              />
              <span className="font-headline">{category.name}</span>
              {category.article_count > 0 && (
                <span className="ml-auto text-xs text-on-surface-variant/60 font-normal">
                  {category.article_count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer del sidebar */}
      <div className="mt-auto p-4 border-t border-outline-variant/15">
        <Link
          href="/admin"
          className="flex items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors"
        >
          <Icon name="admin_panel_settings" size="sm" />
          <span>Admin</span>
        </Link>
      </div>
    </aside>
  );
}
