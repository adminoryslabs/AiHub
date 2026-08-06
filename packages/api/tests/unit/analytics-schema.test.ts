// Unit tests for analytics event Zod schemas
import { describe, it, expect } from 'vitest';
import { AnalyticsEventSchema, AnalyticsEventType, DeviceType, LangSchema } from '@ai-hub/shared';

describe('AnalyticsEventSchema', () => {
  it('validates a complete valid page_view event', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'page_view',
      slug: 'prompt-engineering',
      lang: 'es',
      referrer: 'google.com',
      device_type: 'desktop',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event_type).toBe('page_view');
      expect(result.data.slug).toBe('prompt-engineering');
      expect(result.data.lang).toBe('es');
      expect(result.data.referrer).toBe('google.com');
      expect(result.data.device_type).toBe('desktop');
    }
  });

  it('validates a search event with query and results_count', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'search',
      slug: null,
      lang: 'en',
      referrer: null,
      device_type: 'mobile',
      query: 'rag',
      results_count: 5,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('rag');
      expect(result.data.results_count).toBe(5);
    }
  });

  it('validates a search_zero event with results_count=0', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'search_zero',
      slug: null,
      lang: 'es',
      referrer: null,
      device_type: 'tablet',
      query: 'quantum computing',
      results_count: 0,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event_type).toBe('search_zero');
      expect(result.data.results_count).toBe(0);
    }
  });

  it('validates a not_found event with extra.path', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'not_found',
      slug: null,
      lang: 'es',
      referrer: null,
      device_type: 'desktop',
      extra: { path: '/es/herramientas/no-existe' },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra).toEqual({ path: '/es/herramientas/no-existe' });
    }
  });

  it('validates an article_api event', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'article_api',
      slug: 'prompt-engineering',
      lang: 'en',
      referrer: null,
      device_type: 'desktop',
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing event_type', () => {
    const result = AnalyticsEventSchema.safeParse({
      slug: 'test',
      lang: 'es',
      referrer: null,
      device_type: 'desktop',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid event_type', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'invalid_type',
      slug: 'test',
      lang: 'es',
      referrer: null,
      device_type: 'desktop',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid lang', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'page_view',
      slug: 'test',
      lang: 'fr',
      referrer: null,
      device_type: 'desktop',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid device_type', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'page_view',
      slug: 'test',
      lang: 'es',
      referrer: null,
      device_type: 'smartwatch',
    });

    expect(result.success).toBe(false);
  });

  it('allows nullable slug', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'search',
      slug: null,
      lang: 'es',
      referrer: null,
      device_type: 'desktop',
    });

    expect(result.success).toBe(true);
  });

  it('allows nullable referrer', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'page_view',
      slug: 'test',
      lang: 'es',
      referrer: null,
      device_type: 'desktop',
    });

    expect(result.success).toBe(true);
  });

  it('rejects slug exceeding max length (200)', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'page_view',
      slug: 'a'.repeat(201),
      lang: 'es',
      referrer: null,
      device_type: 'desktop',
    });

    expect(result.success).toBe(false);
  });

  it('rejects query exceeding max length (500)', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'search',
      slug: null,
      lang: 'es',
      referrer: null,
      device_type: 'desktop',
      query: 'a'.repeat(501),
    });

    expect(result.success).toBe(false);
  });

  it('allows unknown extra fields (passthrough)', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'page_view',
      slug: 'test',
      lang: 'es',
      referrer: null,
      device_type: 'desktop',
      extra: { scroll_depth: 80, custom_field: 'value' },
    });

    expect(result.success).toBe(true);
  });

  it('rejects referrer exceeding max length (500)', () => {
    const result = AnalyticsEventSchema.safeParse({
      event_type: 'page_view',
      slug: 'test',
      lang: 'es',
      referrer: 'a'.repeat(501),
      device_type: 'desktop',
    });

    expect(result.success).toBe(false);
  });
});

describe('AnalyticsEventType', () => {
  it('includes all five event types', () => {
    expect(AnalyticsEventType.options).toContain('page_view');
    expect(AnalyticsEventType.options).toContain('search');
    expect(AnalyticsEventType.options).toContain('search_zero');
    expect(AnalyticsEventType.options).toContain('article_api');
    expect(AnalyticsEventType.options).toContain('not_found');
  });
});

describe('DeviceType', () => {
  it('includes mobile, desktop, tablet', () => {
    expect(DeviceType.options).toContain('mobile');
    expect(DeviceType.options).toContain('desktop');
    expect(DeviceType.options).toContain('tablet');
  });
});

describe('LangSchema', () => {
  it('includes es and en', () => {
    expect(LangSchema.options).toContain('es');
    expect(LangSchema.options).toContain('en');
  });
});
