// Analytics event schemas — local copy for the API runtime.
// The @ai-hub/shared package is source-only and cannot be imported at
// runtime by plain Node.js. This file mirrors packages/shared/src/types/analytics.ts
// and is the single source of truth for the API's analytics payload contract.
// Keep in sync with the shared package.
import { z } from 'zod';

export const AnalyticsEventType = z.enum([
  'page_view',
  'search',
  'search_zero',
  'article_api',
  'not_found',
]);

export const DeviceType = z.enum(['mobile', 'desktop', 'tablet']);

export const LangSchema = z.enum(['es', 'en']);

export const AnalyticsEventSchema = z.object({
  event_type: AnalyticsEventType,
  slug: z.string().max(200).nullable(),
  lang: LangSchema,
  referrer: z.string().max(500).nullable(),
  device_type: DeviceType,
  query: z.string().max(500).optional(),
  results_count: z.number().int().optional(),
  extra: z.record(z.unknown()).optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
