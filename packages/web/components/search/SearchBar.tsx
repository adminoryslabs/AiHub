// Barra de búsqueda con overlay de resultados
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/Icon';
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
}

export function SearchBar({ lang }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();

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

  return (
    <div data-search className="relative w-full">
      {/* Input de búsqueda */}
      <div className="relative">
        <Icon
          name="search"
          size="sm"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={lang === 'es' ? 'Buscar artículos...' : 'Search articles...'}
          className="w-full pl-9 pr-4 py-2 text-sm bg-surface-container-low dark:bg-surface-container border border-outline-variant/30 rounded-full text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          aria-label={lang === 'es' ? 'Buscar' : 'Search'}
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
        )}
      </div>

      {/* Overlay de resultados */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant/20 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={result.article_id}
              onClick={() => navigateTo(result)}
              className={`
                w-full text-left px-4 py-3 hover:bg-surface-container transition-colors flex items-start gap-3
                ${index === selectedIndex ? 'bg-primary/5' : ''}
                ${index > 0 ? 'border-t border-outline-variant/10' : ''}
              `}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-on-surface"
                  dangerouslySetInnerHTML={{ __html: result.highlight.title }}
                />
                <p
                  className="text-xs text-on-surface-variant mt-0.5 line-clamp-1"
                  dangerouslySetInnerHTML={{ __html: result.highlight.summary }}
                />
              </div>
              <span className="flex-shrink-0 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {result.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && results.length === 0 && query.trim() && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-xl p-6 text-center z-50">
          <p className="text-sm text-on-surface-variant">
            {lang === 'es' ? 'Sin resultados para' : 'No results for'} &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
