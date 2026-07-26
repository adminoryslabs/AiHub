// Sidebar derecha — TOC del artículo
'use client';

import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/markdown';
import type { Resource } from '@ai-hub/shared';
import { Icon } from '../ui/Icon';

interface SidebarRightProps {
  toc: TocItem[];
  resources: Resource[];
  lang: 'es' | 'en';
}

export function SidebarRight({ toc, resources, lang }: SidebarRightProps) {
  const [activeId, setActiveId] = useState<string>('');

  // Solo mostrar h2 en adelante en el TOC
  const tocItems = toc.filter((item) => item.level >= 2);

  // Scroll-spy: detectar sección activa
  useEffect(() => {
    if (tocItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    for (const item of tocItems) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [toc]);

  return (
    <aside
      className="hidden xl:flex flex-col w-[186px] flex-shrink-0 sticky top-[78px] self-start max-h-[calc(100vh-78px)] overflow-y-auto py-10"
      aria-label={lang === 'es' ? 'Tabla de contenidos y recursos' : 'Table of contents and resources'}
    >
      {/* Tabla de contenidos */}
      {tocItems.length > 0 && (
        <div>
          <p className="font-mono text-[11px] font-medium tracking-[0.1em] text-on-surface-variant mb-3.5">
            {lang === 'es' ? 'EN ESTA PÁGINA' : 'ON THIS PAGE'}
          </p>
          <nav
            className="flex flex-col gap-2.5 border-l border-outline-variant pl-3.5"
            aria-label={lang === 'es' ? 'Tabla de contenidos' : 'Table of contents'}
          >
            {tocItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`
                  block text-[13.5px] leading-tight transition-colors
                  ${item.level > 2 ? 'pl-3' : ''}
                  ${
                    activeId === item.id
                      ? 'text-primary-text font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }
                `}
              >
                {item.text}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* Recursos externos */}
      {resources.length > 0 && (
        <div className="mt-8">
          <p className="font-mono text-[11px] font-medium tracking-[0.1em] text-on-surface-variant mb-3.5">
            {lang === 'es' ? 'RECURSOS' : 'RESOURCES'}
          </p>
          <div className="flex flex-col gap-2.5">
            {resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 border border-outline-variant hover:bg-surface-container transition-colors"
              >
                <p className="text-[12.5px] font-semibold text-on-surface leading-snug flex items-center gap-1.5">
                  <Icon name="arrow_outward" className="text-[14px] flex-shrink-0" />
                  <span>{resource.title}</span>
                </p>
                {resource.description && (
                  <p className="text-[11.5px] text-on-surface-variant mt-1.5 font-body leading-snug">
                    {resource.description}
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
