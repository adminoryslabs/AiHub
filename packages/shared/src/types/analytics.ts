// Analytics event schemas and types — shared between API and web
import { z } from 'zod';

// Event type enum
export const AnalyticsEventType = z.enum([
  'page_view',
  'search',
  'search_zero',
  'article_api',
  'not_found',
]);

// Device type enum
export const DeviceType = z.enum(['mobile', 'desktop', 'tablet']);

// Language enum
export const Lang = z.enum(['es', 'en']);

// Analytics event payload schema (validated at ingest)
export const AnalyticsEventSchema = z.object({
  event_type: AnalyticsEventType,
  slug: z.string().max(200).nullable(),
  lang: Lang,
  referrer: z.string().max(500).nullable(),
  device_type: DeviceType,
  query: z.string().max(500).optional(),
  results_count: z.number().int().optional(),
  extra: z.record(z.unknown()).optional(),
});

// Inferred TypeScript type from the schema
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
