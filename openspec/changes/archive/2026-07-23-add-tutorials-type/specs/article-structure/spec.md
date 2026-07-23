# Spec — article-structure

> Delta spec para `add-tutorials-type`. Archiva a `openspec/specs/article-structure/spec.md`.

## ADDED Requirements

### Requirement: Concept article canonical sections
A concept article (`type: concept`) MUST include the following sections in its Markdown body, in this order. The sections "Qué es", "Modelo mental", "Cómo se usa", and "Cuándo usarlo / cuándo no" are required. "Historia y evolución" is optional.

#### Scenario: Concept article passes structure validation
- **Given** a concept Markdown file with h2 headings `## Qué es`, `## Modelo mental`, `## Cómo se usa`, `## Cuándo usarlo / cuándo no`
- **When** the admin imports the article
- **Then** the import succeeds

#### Scenario: Concept article missing a required section
- **Given** a concept article missing the `## Cuándo usarlo / cuándo no` section
- **When** the admin imports the article
- **Then** the API rejects it with a validation error listing the missing section

### Requirement: Tutorial article canonical sections
A tutorial article (`type: tutorial`) MUST include in its Markdown body, in this order: `## Objetivo` (required, max 2 paragraphs), `## Prerrequisitos` (required), `## Pasos` (required, numbered, each with expected input and verification), and `## Resultado esperado` (required). The sections `## Troubleshooting` and `## Siguiente paso` are optional.

#### Scenario: Tutorial passes structure validation
- **Given** a tutorial Markdown with h2 headings `## Objetivo`, `## Prerrequisitos`, `## Pasos`, `## Resultado esperado`
- **When** the admin imports the article
- **Then** the import succeeds

#### Scenario: Tutorial missing required Pasos section
- **Given** a tutorial Markdown without `## Pasos`
- **When** the admin imports the article
- **Then** the API rejects it with a validation error listing the missing section

### Requirement: Tutorial summary length
The tutorial summary in its frontmatter or admin metadata SHALL NOT exceed 160 characters, matching the concept article constraint.

#### Scenario: Tutorial summary within limit
- **Given** a tutorial with `summary: "Aprende a conectar el MCP de Supabase a Claude Code"` (49 chars)
- **When** the API validates the content
- **Then** the import succeeds

#### Scenario: Tutorial summary exceeds limit
- **Given** a tutorial with a summary exceeding 160 characters
- **When** the API validates the content
- **Then** validation fails

### Requirement: Editorial boundary — tutorial vs. course
A tutorial in AI Hub SHALL be a concise, technical guide that teaches one specific outcome. It SHALL NOT be a comprehensive course spanning multiple topics or requiring hours of work. The length of a tutorial is bounded by its `estimated_time` (declared by the author), not by a fixed word count.

#### Scenario: Tutorial fits within editorial boundary
- **Given** a tutorial article of ~1500 words covering "How to configure MCP in Claude Code" with 5 numbered steps
- **When** the article is reviewed
- **Then** it meets the editorial guideline for a Hub tutorial

#### Scenario: Article exceeds tutorial scope
- **Given** a submission of 4000+ words covering a full multi-module curriculum
- **When** the article is reviewed
- **Then** the reviewer rejects it — it should be a course hosted elsewhere, not a Hub tutorial

### Requirement: admin.md type declaration
Every article's `admin.md` MUST declare exactly one `type` value: `concept` or `tutorial`. The legacy value `tool-branch` SHALL NOT be accepted.

#### Scenario: admin.md with valid tutorial type
- **Given** an admin.md containing `type: tutorial`
- **When** it is imported through admin
- **Then** the article is created with `type = tutorial`

#### Scenario: admin.md with legacy tool-branch type
- **Given** an admin.md containing `type: tool-branch`
- **When** it is imported through admin
- **Then** the API rejects it with an error about invalid type

## REMOVED Requirements

None — no existing main specs to remove.
