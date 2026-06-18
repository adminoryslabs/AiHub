// Selector de idioma ES/EN — estilo terminal `[es]` / `en`
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
    <div className="flex items-center gap-2 font-mono text-[12.5px]">
      <span className="text-primary font-bold">[{currentLang}]</span>
      <Link
        href={currentLang === otherLang ? '#' : otherPath}
        className="text-on-surface-variant hover:text-on-surface transition-colors"
        aria-current={currentLang === otherLang ? 'true' : undefined}
      >
        {otherLang}
      </Link>
    </div>
  );
}
