// Barra de búsqueda con overlay de resultados — estética terminal
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchArticles } from '@/lib/api-client';
import type { SupportedLang } from '@/lib/i18n';

interface SearchResult {
  article_id: string;
  lang: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  highlight: { title: string; summary: string };
}

interface SearchBarProps {
  lang: SupportedLang;
  // Renderiza la variante "prompt" grande del hero (con `hub search` y cursor `_`)
  variant?: 'navbar' | 'hero';
}

export function SearchBar({ lang, variant = 'navbar' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();

  const placeholder =
    variant === 'hero'
      ? 'search'
      : lang === 'es'
        ? 'grep concepto · herramienta · patrón'
        : 'grep concept · tool · pattern';

  // Buscar con debounce de 300ms
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIndex(-1);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await searchArticles({ q: value, lang });
          setResults(data.results as SearchResult[]);
          setIsOpen(true);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [lang]
  );

  // Navegar a artículo
  function navigateTo(result: SearchResult) {
    router.push(`/${result.lang}/${result.category}/${result.slug}`);
    setIsOpen(false);
    setQuery('');
  }

  // Navegación por teclado
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      navigateTo(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }

  // Cerrar overlay al hacer click afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.closest('[data-search]')?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atajo `/` para enfocar el buscador (cross-platform, no ⌘K)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const isHero = variant === 'hero';

  return (
    <div data-search className="relative w-full">
      {/* Input de búsqueda — prompt terminal */}
      <div
        className={`relative flex items-center gap-2.5 ${isHero ? 'h-[52px] px-4' : 'h-[38px] px-3'} bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant rounded-md font-mono focus-within:border-primary/60 transition-colors`}
      >
        <span className="text-primary font-bold text-sm select-none">$</span>

        {isHero && (
          <span className="text-on-surface text-sm select-none hidden sm:inline">hub</span>
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={`flex-1 min-w-0 bg-transparent ${isHero ? 'text-sm' : 'text-[13px]'} text-on-surface placeholder-on-surface-variant focus:outline-none`}
          aria-label={lang === 'es' ? 'Buscar' : 'Search'}
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />

        {isHero && !query && (
          <span className="blink-cursor text-primary text-sm select-none hidden sm:inline">_</span>
        )}

        {/* Hint de atajo `/` */}
        {!isHero && (
          <kbd className="flex-shrink-0 font-mono text-[11px] text-on-surface-variant border border-outline-variant rounded-sm px-1.5 py-px select-none">
            /
          </kbd>
        )}

        {isHero && (
          <kbd className="flex-shrink-0 ml-auto font-mono text-xs text-on-surface-variant border border-outline-variant rounded-sm px-2 py-0.5 select-none">
            /
          </kbd>
        )}

        {loading && (
          <span className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full" />
        )}
      </div>

      {/* Overlay de resultados */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-surface-container-lowest dark:bg-surface-container border border-outline-variant rounded-md overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={result.article_id}
              onClick={() => navigateTo(result)}
              className={`
                w-full text-left px-3.5 py-2.5 hover:bg-surface-container transition-colors flex items-start gap-3 font-mono
                ${index === selectedIndex ? 'bg-surface-container' : ''}
                ${index > 0 ? 'border-t border-outline-variant' : ''}
              `}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold text-on-surface"
                  dangerouslySetInnerHTML={{ __html: result.highlight.title }}
                />
                <p
                  className="text-xs text-on-surface-variant mt-0.5 line-clamp-1 font-body"
                  dangerouslySetInnerHTML={{ __html: result.highlight.summary }}
                />
              </div>
              <span className="flex-shrink-0 text-[11px] text-primary border border-primary/40 rounded-sm px-1.5 py-px">
                {result.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && results.length === 0 && query.trim() && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-surface-container-lowest dark:bg-surface-container border border-outline-variant rounded-md p-6 text-center z-50 font-mono">
          <p className="text-sm text-on-surface-variant">
            {lang === 'es' ? 'sin resultados para' : 'no results for'} <span className="text-on-surface">{query}</span>
          </p>
        </div>
      )}
    </div>
  );
}
