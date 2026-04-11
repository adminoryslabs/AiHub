// Sidebar derecha: TOC + recursos (solo en páginas de artículo)
'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import type { TocItem } from '@/lib/markdown';
import type { Resource } from '@ai-hub/shared';

interface SidebarRightProps {
  toc: TocItem[];
  resources: Resource[];
}

export function SidebarRight({ toc, resources }: SidebarRightProps) {
  const [activeId, setActiveId] = useState<string>('');

  // Scroll-spy: detectar sección activa
  useEffect(() => {
    if (toc.length === 0) return;

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

    for (const item of toc) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [toc]);

  return (
    <aside className="hidden xl:flex flex-col w-80 fixed right-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto z-40 p-6 gap-8">
      {/* Tabla de contenidos */}
      {toc.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-3">
            En este artículo
          </h3>
          <nav className="space-y-1">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`
                  block text-sm py-1 transition-colors duration-150
                  ${item.level > 1 ? 'pl-4' : ''}
                  ${
                    activeId === item.id
                      ? 'text-primary font-semibold'
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
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 mb-3">
            Recursos
          </h3>
          <div className="space-y-2">
            {resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group"
              >
                <Icon
                  name={getResourceIcon(resource.type)}
                  size="sm"
                  className="text-on-surface-variant mt-0.5 flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                    {resource.title}
                  </p>
                  {resource.description && (
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                      {resource.description}
                    </p>
                  )}
                </div>
                <Icon
                  name="open_in_new"
                  size="sm"
                  className="text-on-surface-variant flex-shrink-0 mt-0.5"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function getResourceIcon(type: string): string {
  const icons: Record<string, string> = {
    doc: 'description',
    video: 'play_circle',
    course: 'school',
    article: 'article',
  };
  return icons[type] || 'link';
}
