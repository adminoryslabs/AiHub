// Sidebar derecha: TOC + recursos (solo en páginas de artículo) — estilo terminal
'use client';

import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/markdown';
import type { Resource } from '@ai-hub/shared';

interface SidebarRightProps {
  toc: TocItem[];
  resources: Resource[];
  lang: 'es' | 'en';
}

// Prefijo markdown según el nivel del encabezado
function tocPrefix(level: number): string {
  if (level <= 2) return '#';
  if (level === 3) return '##';
  return '###';
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
    <aside className="hidden xl:flex flex-col w-80 fixed right-0 top-[58px] h-[calc(100vh-58px)] overflow-y-auto z-40 p-6 gap-8 font-mono">
      {/* Tabla de contenidos */}
      {tocItems.length > 0 && (
        <div>
          <p className="text-[11px] font-bold tracking-wide text-on-surface-variant mb-3">
            // {lang === 'es' ? 'en este artículo' : 'in this article'}
          </p>
          <nav className="flex flex-col gap-2">
            {tocItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`
                  block text-[13px] py-0.5 transition-colors
                  ${item.level > 2 ? 'pl-3.5' : ''}
                  ${
                    activeId === item.id
                      ? 'text-primary font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }
                `}
              >
                <span className="text-primary/70 mr-1">{tocPrefix(item.level)}</span>
                <span className="lowercase">{item.text}</span>
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* Recursos externos */}
      {resources.length > 0 && (
        <div>
          <p className="text-[11px] font-bold tracking-wide text-on-surface-variant mb-3">
            // {lang === 'es' ? 'recursos' : 'resources'}
          </p>
          <div className="flex flex-col gap-2">
            {resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 border border-outline-variant rounded-sm hover:bg-surface-container transition-colors"
              >
                <p className="text-[12.5px] font-semibold text-on-surface">
                  ↗ {resource.title}
                </p>
                {resource.description && (
                  <p className="text-[11px] text-on-surface-variant mt-1 font-body">
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
