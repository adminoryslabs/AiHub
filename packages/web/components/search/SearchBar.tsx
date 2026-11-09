// Barra de búsqueda con overlay de resultados — estilo "Minimal"
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
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
  // "navbar" para el header, "hero" para el hero de la portada
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
      ? lang === 'es'
        ? 'Busca un concepto, p. ej. "¿qué es un LLM?"'
        : 'Search a concept, e.g. "what is an LLM?"'
      : lang === 'es'
        ? 'Buscar conceptos, herramientas…'
        : 'Search concepts, tools…';

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

  function navigateTo(result: SearchResult) {
    router.push(`/${result.lang}/${result.category}/${result.slug}`);
    setIsOpen(false);
    setQuery('');
  }

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.closest('[data-search]')?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atajo `/` para enfocar el buscador
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
      <div
        className={`
          relative flex items-center gap-2.5
          ${isHero ? 'h-[54px] px-5' : 'h-[38px] px-3.5'}
          bg-orys-bg-raised border ${isHero ? 'border-orys-line-strong' : 'border-orys-line'}
          focus-within:border-orys-line-brand
          transition-colors
        `}
      >
        <Search
          size={isHero ? 22 : 18}
          strokeWidth={1.75}
          className="flex-shrink-0 text-orys-fg"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={`
            flex-1 min-w-0 bg-transparent font-orys-sans appearance-none border-0 outline-none
            focus:[outline:none] focus:[box-shadow:none] focus:[border-color:transparent]
            ${isHero ? 'text-[15.5px]' : 'text-[13.5px]'}
            text-orys-fg placeholder-orys-fg-mute
          `}
          aria-label={lang === 'es' ? 'Buscar' : 'Search'}
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />

        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-orys-accent border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Overlay de resultados */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-orys-bg-panel border border-orys-line overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={result.article_id}
              onClick={() => navigateTo(result)}
              className={`
                w-full text-left px-4 py-2.5 hover:bg-orys-bg-raised transition-colors flex items-start gap-3
                ${index === selectedIndex ? 'bg-orys-bg-raised' : ''}
                ${index > 0 ? 'border-t border-orys-line' : ''}
              `}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold text-orys-fg"
                  dangerouslySetInnerHTML={{ __html: result.highlight.title }}
                />
                <p
                  className="text-xs text-orys-fg-dim mt-0.5 line-clamp-1 font-orys-sans"
                  dangerouslySetInnerHTML={{ __html: result.highlight.summary }}
                />
              </div>
              <span className="flex-shrink-0 font-orys-mono text-[11px] text-orys-accent border border-orys-line px-1.5 py-px">
                {result.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && results.length === 0 && query.trim() && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-orys-bg-panel border border-orys-line p-6 text-center z-50">
          <p className="text-sm text-orys-fg-dim">
            {lang === 'es' ? 'sin resultados para' : 'no results for'}{' '}
            <span className="text-orys-fg">{query}</span>
          </p>
        </div>
      )}
    </div>
  );
}
