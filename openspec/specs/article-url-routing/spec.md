# Spec — article-url-routing

> Source of truth for `article-url-routing` requirements. Created from archived change `add-tutorials-type` on 2026-07-23.

## ADDED Requirements

### Requirement: Concept URL pattern preserved
Concept articles (`type: concept`) MUST follow the existing URL pattern `/{lang}/{category-slug}/{article-slug}`, where `category-slug` uses the translated category name for the lang (e.g., `fundamentos` for ES, `fundamentals` for EN).

#### Scenario: Concept URL in Spanish
- **Given** a concept with `slug: que-es-mcp` and `category: fundamentals`
- **When** the reader visits the Spanish version
- **Then** the URL is `/es/fundamentos/que-es-mcp`

#### Scenario: Concept URL in English
- **Given** the same concept with `slug: what-is-mcp` and `category: fundamentals`
- **When** the reader visits the English version
- **Then** the URL is `/en/fundamentals/what-is-mcp`

### Requirement: Tutorial URL pattern
Tutorial articles (`type: tutorial`) MUST follow the pattern `/es/tutoriales/{slug}` for Spanish and `/en/tutorials/{slug}` for English. Tutorials SHALL NOT use the `/{lang}/{category-slug}/{slug}` pattern.

#### Scenario: Tutorial URL in Spanish
- **Given** a tutorial with ES slug `mcp-en-claude-code`
- **When** the reader visits the Spanish version
- **Then** the URL is `/es/tutoriales/mcp-en-claude-code`

#### Scenario: Tutorial URL in English
- **Given** the same tutorial with EN slug `mcp-in-claude-code`
- **When** the reader visits the English version
- **Then** the URL is `/en/tutorials/mcp-in-claude-code`

### Requirement: Tutorial list endpoint
The public API MUST expose `GET /public/tutorials` returning a paginated list of published tutorials. The endpoint SHALL accept an optional query parameter `difficulty` (values: `beginner`, `intermediate`, `advanced`) to filter results.

#### Scenario: List all tutorials
- **Given** 5 published tutorials in the database
- **When** `GET /public/tutorials?lang=es` is called
- **Then** the response returns all 5 tutorials with their slugs, titles, summaries, and estimated times

#### Scenario: Filter tutorials by difficulty
- **Given** 3 beginner and 2 intermediate tutorials
- **When** `GET /public/tutorials?difficulty=beginner` is called
- **Then** the response returns only the 3 beginner tutorials

#### Scenario: Invalid difficulty filter
- **Given** the endpoint receives `difficulty=expert`
- **When** the API validates the query parameter
- **Then** it returns a 400 error

### Requirement: Tutorial route rendering
The frontend MUST render tutorial content differently from concept content. A tutorial page SHALL display `difficulty` and `estimated_time` badges above the title, render `## Pasos` with numbered step cards and per-step verification blocks, and include collapsible `## Troubleshooting` when present.

#### Scenario: Tutorial page renders step cards
- **Given** a published tutorial with 4 steps under `## Pasos`
- **When** a reader opens `/es/tutoriales/conectar-mcp-supabase`
- **Then** the page shows 4 numbered step cards, each with a "Verificación" sub-block

### Requirement: Sidebar with tutorial section
The site sidebar SHALL display 5 conceptual category sections (Fundamentos, Agentes, Prompting, Patrones, Herramientas) plus a "Tutoriales" (ES) / "Tutorials" (EN) section. The tutorial section MUST include a sub-filter by `difficulty`.

#### Scenario: Sidebar renders tutorial section
- **Given** the reader is on any page
- **When** the sidebar is rendered in Spanish
- **Then** a "Tutoriales" section appears below the 5 categories, with sub-items "Principiante", "Intermedio", "Avanzado"

### Requirement: SEO — hreflang for tutorial routes
Every tutorial page MUST include `<link rel="alternate" hreflang="..." />` tags pointing to the corresponding page in the other language, matching the behavior of concept pages.

#### Scenario: Tutorial hreflang tags present
- **Given** a tutorial published in both ES and EN
- **When** Google crawls `/es/tutoriales/mcp-en-claude-code`
- **Then** the page head includes `<link rel="alternate" hreflang="en" href="/en/tutorials/mcp-in-claude-code" />` and vice versa

### Requirement: Sitemap includes tutorial routes
The sitemap (`/sitemap.xml`) MUST include tutorial URLs with their `<lastmod>` and language alternates declarations, using the same structure as concept routes.

#### Scenario: Sitemap contains tutorial URLs
- **Given** 2 published tutorials
- **When** `/sitemap.xml` is generated
- **Then** both `/es/tutoriales/{slug}` and `/en/tutorials/{slug}` URLs are present with correct `<xhtml:link rel="alternate">` entries
