# Spec — article-type-system

> Source of truth for `article-type-system` requirements. Created from archived change `add-tutorials-type` on 2026-07-23.

## ADDED Requirements

### Requirement: Valid article types
The `articles.type` column MUST accept only `concept` and `tutorial`. The value `tool-branch` SHALL NOT be accepted after migration.

#### Scenario: Create concept article
- **Given** the admin submits an article with `type: concept`
- **When** the API validates the payload
- **Then** validation passes and the article is created

#### Scenario: Create tutorial article
- **Given** the admin submits an article with `type: tutorial`
- **When** the API validates the payload
- **Then** validation passes and the article is created

#### Scenario: Reject legacy tool-branch type
- **Given** the admin submits an article with `type: tool-branch`
- **When** the API validates the payload
- **Then** validation fails with a 400 error indicating `type` must be `concept` or `tutorial`

### Requirement: No parent_id column
The `articles` table SHALL NOT have a `parent_id` column. Article-to-article relationships MUST be managed exclusively through `article_relations` (types: `related`, `prerequisite`, `next`).

#### Scenario: Article has no parent reference
- **Given** any article (concept or tutorial)
- **When** its row is inspected in the database
- **Then** no `parent_id` field exists on the row

#### Scenario: Article linked via relations table
- **Given** a tutorial "MCP en Claude Code" and a concept "Qué es MCP"
- **When** a `prerequisite` relation is created in `article_relations` connecting them
- **Then** the relation is queryable via the relations API, and the frontend renders the related articles according to the relation type (`prerequisite` in this case) under the standard related-articles surface

### Requirement: Difficulty field
The `articles` table MUST have a `difficulty` column of type `VARCHAR(15)` with a CHECK constraint accepting `beginner`, `intermediate`, or `advanced`. The field SHALL be required when `type = tutorial` and SHOULD be `NULL` for concepts.

#### Scenario: Tutorial with valid difficulty
- **Given** the admin imports a tutorial with `difficulty: intermediate`
- **When** the API validates the payload
- **Then** validation passes

#### Scenario: Tutorial without difficulty
- **Given** the admin imports a tutorial without a `difficulty` value
- **When** the API validates the payload
- **Then** validation fails with a 400 error indicating `difficulty` is required for tutorials

#### Scenario: Invalid difficulty value
- **Given** the admin imports a tutorial with `difficulty: expert`
- **When** the API validates the payload
- **Then** validation fails with a 400 error

### Requirement: Estimated time field
The `articles` table MUST have an `estimated_time` column of type `VARCHAR(50)` storing free-text durations (e.g., `"15 min"`, `"1 hour"`). The field SHALL be required when `type = tutorial` and SHOULD be `NULL` for concepts.

#### Scenario: Tutorial with estimated time
- **Given** the admin imports a tutorial with `estimated_time: "30 min"`
- **When** the API validates the payload
- **Then** validation passes

#### Scenario: Tutorial without estimated time
- **Given** the admin imports a tutorial without `estimated_time`
- **When** the API validates the payload
- **Then** validation fails with a 400 error

### Requirement: applicable_as_of availability
The `applicable_as_of` column SHALL remain on the `articles` table and be available for any `type` (concept or tutorial) when the article describes tool-specific behavior that may become outdated. The field SHOULD be `NULL` for tool-agnostic articles.

#### Scenario: Tool-specific tutorial with applicable_as_of
- **Given** a tutorial "Cómo conectar el MCP de Supabase" declares `applicable_as_of: "julio 2026"`
- **When** the tutorial is rendered
- **Then** the reader sees a badge or note indicating the content was verified as of July 2026

#### Scenario: Tool-agnostic concept without applicable_as_of
- **Given** a concept article "Qué es MCP" with no `applicable_as_of`
- **When** the article is rendered
- **Then** no version/date badge is shown

### Requirement: Migration mapping
The 8 existing `tool-branch` articles MUST be migrated to the new type system during deployment as follows:

| Article slug | From | To |
|---|---|---|
| `claude-code-for-testing` | tool-branch | **tutorial** |
| `getting-started-with-claude-design` | tool-branch | **tutorial** |
| `stitch-infinite-canvas` | tool-branch | **tutorial** |
| `stitch-screen-by-screen` | tool-branch | **tutorial** |
| `stitch` | tool-branch | **concept** (category: tools) |
| `warp-terminal` | tool-branch | **concept** (category: tools) |
| `stitch-vs-figma` | tool-branch | **concept** (category: tools) |
| `subagents-in-claude-code` | tool-branch | **concept** (category: tools) |

#### Scenario: Migration completes without data loss
- **Given** a pre-migration backup exists
- **When** the migration SQL is applied (DROP parent_id, ADD difficulty/estimated_time, UPDATE type on 8 articles, ALTER CHECK constraint)
- **Then** all 8 articles exist with their new `type`, concepts have `difficulty = NULL`, tutorials have difficulty populated, and no rows were lost
