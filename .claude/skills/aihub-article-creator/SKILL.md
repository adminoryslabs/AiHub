---
name: aihub-article-creator
description: Crea artículos bilingües importables para AI Hub. Use when the user asks to generate, draft, or prepare a new AI Hub article in Spanish and English.
---

# AI Hub Article Creator

## Goal

Create production-ready bilingual article drafts for AI Hub that can be imported directly into the admin panel.

The primary outcome is **files written to disk**, not Markdown pasted into chat.

The skill must create exactly three artifacts:

1. `es.md` — Spanish Markdown content, directly importable.
2. `en.md` — English Markdown content, directly importable.
3. `admin.md` — metadata, suggested relations, resources, and image notes for manual entry in the admin panel.

Default location:

```text
articles/{slug_uk}/
├── es.md
├── en.md
└── admin.md
```

If `articles/{slug_uk}/` already exists, inspect it first. Do not overwrite existing files unless the user explicitly asks to regenerate or replace them.

## Required Context

Before writing, consult:

- `docs/article-guidelines.md`
- Existing examples under `articles/`, especially article pairs with `es.md` and `en.md`

If the user gives an existing `slug_uk`, article title, topic, or selected file context, use it as the primary topic signal.

## Editorial Standards

Spanish quality is critical.

- Use correct accents, punctuation, and opening signs: `¿?` and `¡!`.
- Do not omit opening question or exclamation marks in Spanish headings or prose.
- Prefer neutral Latin American Spanish.
- Keep technical terms in English when that is the stable developer term: `token`, `embedding`, `prompt`, `fine-tuning`, `RAG`.
- Avoid literal translation. Write ES and EN independently for native readers.
- Avoid marketing language: no “revolucionario”, “increíble”, “cambia todo”, “the future of”.
- Use active voice and direct explanations.
- The first paragraph must define the topic directly. No “en este artículo veremos...”.

## Article Body Rules

The two Markdown files must be importable as-is in the admin panel.

Each `.md` file must contain frontmatter:

```yaml
---
title: "..."
slug: "..."
summary: "..."
lang: es
---
```

For English, use `lang: en`.

Body sections for `concept` articles:

- Spanish: `## ¿Qué es?`, `## Modelo mental`, `## ¿Cómo se usa?`, `## ¿Cuándo usarlo / cuándo no?`
- English: `## What is it`, `## Mental model`, `## How it's used`, `## When to use it / when not to`
- Optional history section only if it adds useful context.

Body sections for `tool-branch` articles:

- Spanish: `## Contexto`, `## Configuración / setup`, `## Ejemplos`, `## Particularidades`
- English: `## Context`, `## Setup`, `## Examples`, `## Particularities`

Do not include these sections in the Markdown body:

- `Conceptos relacionados`
- `Related concepts`
- `Recursos externos`
- `External resources`

Those are managed from the admin panel and must be listed only in `admin.md`.

## Metadata Rules

Choose and report in `admin.md`:

- `slug_uk`: canonical English slug, lowercase, hyphenated.
- `type`: `concept` or `tool-branch`.
- `category`: one of `fundamentals`, `agents`, `prompting`, `patterns`, `tools`.
- `volatility`: `low`, `medium`, or `high`.
- `featured`: normally `false` unless the user explicitly asks.
- `applicable_as_of`: required for `tool-branch`, otherwise `null`.

Category guidance:

- `fundamentals`: base concepts like LLMs, tokens, context, embeddings, fine-tuning.
- `agents`: agents, tools, memory, orchestration, multi-agent systems.
- `prompting`: prompting techniques and prompt structure.
- `patterns`: RAG, function calling, structured output, evals, guardrails.
- `tools`: tool-specific branches only.

Volatility guidance:

- `low`: durable fundamentals.
- `medium`: patterns and practices that evolve gradually.
- `high`: tool-specific behavior, APIs, prices, model limits, implementation details.

## Relations, Resources, And Images

In `admin.md`, suggest relations separately from the article body.

Relation types:

- `related`: lateral concepts.
- `prerequisite`: useful prior reading.
- `next`: recommended next article.

Use `slug_uk` when known. If the related article probably does not exist yet, mark it as `planned`.

Resources:

- Suggest 2-6 external resources.
- Use types: `doc`, `video`, `course`, `article`.
- Prefer official docs, papers, high-quality engineering posts, and durable references.
- Do not place resource links in the Markdown body.

Images:

- If an image would help, list `image_suggestions` in `admin.md`.
- If no image is needed, use `image_suggestions: []`.
- Do not invent R2 URLs.
- If an uploaded URL is provided by the user, insert it in the Markdown with normal Markdown syntax.

## File Creation Workflow

Default behavior:

1. Determine `slug_uk` from the user request. If missing or ambiguous, ask one short clarification question.
2. Create `articles/{slug_uk}/` if it does not exist.
3. Write `es.md`, `en.md`, and `admin.md` as real files in that directory.
4. Return a concise final message with the file paths created and any open manual admin steps.

Do not paste full article bodies into chat unless the user explicitly asks for a preview instead of files.

When editing files, preserve existing unrelated content. If replacing existing article files, ask for confirmation first unless the user explicitly requested overwrite/regeneration.

## File Formats

Use these exact file formats.

`articles/{slug_uk}/es.md`:

```markdown
---
title: "¿... ?"
slug: "..."
summary: "..."
lang: es
---

...
```

`articles/{slug_uk}/en.md`:

```markdown
---
title: "..."
slug: "..."
summary: "..."
lang: en
---

...
```

`articles/{slug_uk}/admin.md`:

````markdown
# Admin fields

```yaml
metadata:
  slug_uk: ...
  type: concept
  category: fundamentals
  volatility: low
  featured: false
  applicable_as_of: null
relations_suggested:
  related: []
  prerequisite: []
  next: []
resources_suggested: []
image_suggestions: []
```
````

## Final Quality Gate

Before final output, silently check:

- Spanish headings use opening signs where applicable: `¿Qué es?`, `¿Cómo se usa?`, `¿Cuándo usarlo / cuándo no?`.
- Spanish prose has accents and punctuation.
- Summaries are under 160 characters when possible.
- Both files include valid frontmatter.
- No related concepts or external resources sections appear inside `es.md` or `en.md`.
- Metadata values are valid for the admin panel.
