// Navbar — sticky, fondo translúcido + backdrop-blur, borde inferior sutil
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { SearchBar } from '../search/SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { SupportedLang } from '@/lib/i18n';

interface NavbarProps {
  lang: SupportedLang;
  currentPath?: string;
  alternateUrl?: string;
}

export function Navbar({ lang, currentPath = '', alternateUrl }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  return (
    <header className="sticky top-0 z-50 h-[58px] bg-orys-bg-blur border-b border-orys-line backdrop-blur-md">
      <div className="mx-auto max-w-[1220px] h-full flex items-center gap-5 px-6 sm:px-8">
        {/* Logo — nodo de acento + AI Hub en la tipografía de la marca */}
        <Link
          href={`/${lang}`}
          className="flex items-center gap-2.5 flex-shrink-0"
          aria-label="AI Hub"
        >
          <span className="block w-[11px] h-[11px] bg-orys-accent flex-shrink-0" aria-hidden="true" />
          <span className="font-orys-sans font-bold text-[17px] tracking-tight text-orys-fg leading-none">
            AI Hub
          </span>
        </Link>

        {/* Búsqueda — empujada a la derecha con ml-auto */}
        <div className="ml-auto w-full max-w-[520px] hidden md:block">
          <SearchBar lang={lang} variant="navbar" />
        </div>

        {/* Controles — derecha */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Búsqueda mobile */}
          <Link
            href={`/${lang}#search`}
            className="md:hidden p-1.5 text-orys-fg-dim hover:text-orys-fg transition-colors"
            aria-label="Buscar"
          >
            <Search size={20} strokeWidth={1.75} aria-hidden="true" />
          </Link>

          <LanguageSwitcher currentLang={lang} currentPath={currentPath} alternateUrl={alternateUrl} />
          <ThemeToggle />

          {/* Botón menú hamburger mobile */}
          <button
            className="md:hidden p-1.5 text-orys-fg-dim hover:text-orys-fg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
