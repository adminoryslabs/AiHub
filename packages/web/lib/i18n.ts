// Utilidades de i18n: idiomas, íconos de categorías, resolución de slugs
import type { Category } from '@ai-hub/shared';

// Idiomas soportados
export const SUPPORTED_LANGS = ['es', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

// Mapa estático de íconos por categoría (slug → Material Symbol)
// Es una decisión de UI, los nombres vienen de la API
export const CATEGORY_ICONS: Record<string, string> = {
  fundamentals: 'menu_book',
  agents: 'smart_toy',
  prompting: 'terminal',
  patterns: 'extension',
  tools: 'construction',
};

// Obtener el ícono de una categoría (con fallback)
export function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] || 'folder';
}

// Detectar idioma preferido del usuario desde el header Accept-Language
export function detectLanguage(acceptLanguageHeader: string | null): SupportedLang {
  if (!acceptLanguageHeader) return 'es';

  const langs = acceptLanguageHeader
    .split(',')
    .map((l) => l.split(';')[0].trim().substring(0, 2).toLowerCase());

  for (const lang of langs) {
    if (SUPPORTED_LANGS.includes(lang as SupportedLang)) {
      return lang as SupportedLang;
    }
  }

  return 'es';
}

// Obtener el nombre localizado de una categoría
export function getCategoryName(category: Category, _lang: SupportedLang): string {
  return category.name;
}

// Resolver el slug localizado de una categoría a partir del slug canónico
// (las categorías en la API devuelven name_es y name_en según lang)
export function buildCategoryUrl(categorySlug: string, lang: SupportedLang): string {
  return `/${lang}/${categorySlug}`;
}

// Construir URL completa de un artículo
export function buildArticleUrl(
  lang: SupportedLang,
  categorySlug: string,
  articleSlug: string
): string {
  return `/${lang}/${categorySlug}/${articleSlug}`;
}

// Validar si un lang es soportado
export function isValidLang(lang: string): lang is SupportedLang {
  return SUPPORTED_LANGS.includes(lang as SupportedLang);
}

// Obtener el idioma alternativo
export function getAlternateLang(lang: SupportedLang): SupportedLang {
  return lang === 'es' ? 'en' : 'es';
}
