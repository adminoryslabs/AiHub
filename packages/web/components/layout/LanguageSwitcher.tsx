// Selector de idioma ES/EN — mono inline, sin corchetes
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

  let otherPath: string;
  if (alternateUrl) {
    otherPath = alternateUrl;
  } else {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 0) parts[0] = otherLang;
    otherPath = '/' + parts.join('/') || `/${otherLang}`;
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-[12px] font-medium select-none">
      <span className="text-primary-text">{currentLang.toUpperCase()}</span>
      <span className="text-outline-variant" aria-hidden="true">/</span>
      <Link
        href={currentLang === otherLang ? '#' : otherPath}
        className="text-on-surface-variant hover:text-on-surface transition-colors"
        aria-current={currentLang === otherLang ? 'true' : undefined}
      >
        {otherLang.toUpperCase()}
      </Link>
    </div>
  );
}
