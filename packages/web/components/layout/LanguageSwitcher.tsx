// Selector de idioma ES/EN estilo pill
'use client';

import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n';

interface LanguageSwitcherProps {
  currentLang: SupportedLang;
  currentPath: string;
  // URL canónica del idioma alternativo (proviene de la API del artículo)
  alternateUrl?: string;
}

export function LanguageSwitcher({ currentLang, currentPath, alternateUrl }: LanguageSwitcherProps) {
  const otherLang: SupportedLang = currentLang === 'es' ? 'en' : 'es';

  // Usar la URL del idioma alternativo que viene de la API si está disponible.
  // Fallback: reemplazar solo el segmento de idioma (sirve para home y categorías).
  let otherPath: string;
  if (alternateUrl) {
    otherPath = alternateUrl;
  } else {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 0) parts[0] = otherLang;
    otherPath = '/' + parts.join('/') || `/${otherLang}`;
  }

  return (
    <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/15">
      {(['es', 'en'] as SupportedLang[]).map((lang) => (
        <Link
          key={lang}
          href={lang === currentLang ? '#' : otherPath}
          className={`
            px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150
            ${
              lang === currentLang
                ? 'bg-white dark:bg-surface-container text-primary shadow-sm pointer-events-none'
                : 'text-on-surface-variant hover:text-on-surface'
            }
          `}
          aria-current={lang === currentLang ? 'true' : undefined}
        >
          {lang.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
