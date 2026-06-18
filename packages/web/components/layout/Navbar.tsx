// Componente Navbar: status bar terminal fija
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SearchBar } from '../search/SearchBar';
import type { SupportedLang } from '@/lib/i18n';

// Versión mostrada en el logo (alineada con la marca OrysLabs)
const HUB_VERSION = 'v2026.06';

interface NavbarProps {
  lang: SupportedLang;
  currentPath?: string;
  alternateUrl?: string;
}

export function Navbar({ lang, currentPath = '', alternateUrl }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cerrar menú al navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[58px] bg-surface-container border-b border-outline-variant font-mono">
      <div className="flex items-center h-full px-5 gap-4">
        {/* Logo — cuadrado cyan + ai-hub + versión */}
        <Link href={`/${lang}`} className="flex items-center gap-2.5 flex-shrink-0">
          <span className="block w-[11px] h-[18px] bg-primary" aria-hidden="true" />
          <span className="font-bold text-[15px] tracking-tight text-on-surface leading-none">
            ai-hub
          </span>
          <span className="text-xs text-on-surface-variant leading-none hidden sm:inline">
            {HUB_VERSION}
          </span>
        </Link>

        {/* Búsqueda — centro, estilo prompt */}
        <div className="flex-1 max-w-[560px] mx-auto hidden md:block">
          <SearchBar lang={lang} />
        </div>

        {/* Controles — derecha */}
        <div className="flex items-center gap-3 ml-auto flex-shrink-0 text-[12.5px]">
          {/* Búsqueda mobile */}
          <button
            className="md:hidden p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant"
            aria-label="Buscar"
          >
            <Icon name="search" size="md" />
          </button>

          <LanguageSwitcher currentLang={lang} currentPath={currentPath} alternateUrl={alternateUrl} />
          <ThemeToggle />

          {/* Botón menú hamburger mobile */}
          <button
            className="md:hidden p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú"
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} size="md" />
          </button>
        </div>
      </div>
    </header>
  );
}
