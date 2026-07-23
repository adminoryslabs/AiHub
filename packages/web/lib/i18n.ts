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

// Descripciones localizadas por categoría (la API no devuelve descripción)
export const CATEGORY_DESCRIPTIONS: Record<string, { es: string; en: string }> = {
  fundamentals: {
    es: 'Las bases: cómo funcionan los modelos y por qué.',
    en: 'The basics: how models work and why.',
  },
  agents: {
    es: 'Sistemas que razonan, usan herramientas y actúan.',
    en: 'Systems that reason, use tools and act.',
  },
  prompting: {
    es: 'Técnicas para comunicarte con modelos con efectividad.',
    en: 'Techniques to communicate with models effectively.',
  },
  patterns: {
    es: 'Arquitecturas recurrentes en sistemas de IA.',
    en: 'Recurring architectures in AI systems.',
  },
  tools: {
    es: 'El stack práctico: frameworks, SDKs y plataformas.',
    en: 'The practical stack: frameworks, SDKs and platforms.',
  },
};

// Obtener el ícono de una categoría (con fallback)
export function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] || 'folder';
}

// Obtener la descripción localizada de una categoría (con fallback al nombre)
export function getCategoryDescription(slug: string, lang: SupportedLang): string {
  return CATEGORY_DESCRIPTIONS[slug]?.[lang] ?? '';
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

// Construir URL de tutorial según el idioma
export function buildTutorialUrl(lang: SupportedLang, slug: string): string {
  const namespace = lang === 'es' ? 'tutoriales' : 'tutorials';
  return `/${lang}/${namespace}/${slug}`;
}

// Labels de dificultad localizados
export const DIFFICULTY_LABELS_ES: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export const DIFFICULTY_LABELS_EN: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
