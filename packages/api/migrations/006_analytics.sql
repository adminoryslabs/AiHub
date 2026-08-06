-- Analytics schema: event collection, rollups, and configuration
-- Migration 006 — idempotent (IF NOT EXISTS)

-- Raw events table (90-day retention by default)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(30) NOT NULL,
  slug VARCHAR(200),
  lang CHAR(2) NOT NULL,
  referrer_domain VARCHAR(500),
  device_type VARCHAR(10) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  query VARCHAR(500),
  results_count INT,
  extra JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_slug_created
  ON analytics_events (slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created
  ON analytics_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_referrer
  ON analytics_events (referrer_domain);

-- BRIN index for efficient retention purge (time-based sequential scan)
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_brin
  ON analytics_events USING brin (created_at);

-- Hourly rollup table
CREATE TABLE IF NOT EXISTS analytics_rollups_hourly (
  hour TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  slug VARCHAR(200) NOT NULL DEFAULT '',
  lang CHAR(2) NOT NULL,
  referrer_domain VARCHAR(500) NOT NULL DEFAULT '',
  device_type VARCHAR(10) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (hour, event_type, slug, lang, referrer_domain, device_type)
);

-- Daily rollup table
CREATE TABLE IF NOT EXISTS analytics_rollups_daily (
  day TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  slug VARCHAR(200) NOT NULL DEFAULT '',
  lang CHAR(2) NOT NULL,
  referrer_domain VARCHAR(500) NOT NULL DEFAULT '',
  device_type VARCHAR(10) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event_type, slug, lang, referrer_domain, device_type)
);

-- Configuration table (single-row key/value)
CREATE TABLE IF NOT EXISTS analytics_config (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed default configuration
INSERT INTO analytics_config (key, value)
VALUES ('retention_days', '90')
ON CONFLICT (key) DO NOTHING;
