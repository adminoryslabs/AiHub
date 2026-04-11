// Componente Navbar: barra de navegación fija con efecto glass
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SearchBar } from '../search/SearchBar';
import type { SupportedLang } from '@/lib/i18n';

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
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-nav bg-surface-container-lowest/85 dark:bg-surface/90 border-b border-outline-variant/15">
      <div className="flex items-center h-full px-4 gap-4">
        {/* Logo */}
        <Link
          href={`/${lang}`}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
            <Icon name="hub" className="text-on-primary text-sm" />
          </div>
          <span className="font-headline font-bold text-on-surface text-lg hidden sm:block">
            AI Hub
          </span>
        </Link>

        {/* Búsqueda — centro */}
        <div className="flex-1 max-w-2xl mx-auto hidden md:block">
          <SearchBar lang={lang} />
        </div>

        {/* Controles — derecha */}
        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Búsqueda mobile */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-surface-container text-on-surface-variant"
            aria-label="Buscar"
          >
            <Icon name="search" size="md" />
          </button>

          <LanguageSwitcher currentLang={lang} currentPath={currentPath} alternateUrl={alternateUrl} />
          <ThemeToggle />

          {/* Botón menú hamburger mobile */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-surface-container text-on-surface-variant"
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
