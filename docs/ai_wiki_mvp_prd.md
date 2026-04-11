# PRD — AI Wiki (MVP)

## 1. Overview
AI Wiki is a curated knowledge hub focused on **building with Generative AI** (LLMs, agents, skills, rules, and workflows).

The product is not just an encyclopedia, but a **structured learning and exploration system** that:
- Explains key concepts clearly
- Connects them through relationships (knowledge graph mindset)
- Serves as an entry point to high-quality external resources

---

## 2. Goals (MVP)
- Provide **high-quality, structured explanations** of core GenAI building concepts
- Enable **intuitive navigation between related concepts**
- Curate and surface **external learning resources** (docs, courses, videos)
- Establish a **clean, modern, non-commercial UI**

---

## 3. Non-Goals (MVP)
- Open public contributions
- Full Wikipedia-like editing system
- Complex versioning system
- AI autonomous content generation (future phase)

---

## 4. Target User
- Software engineers
- AI builders
- Technical product developers

Specifically:
> People who want to understand how to **design and build systems with LLMs**

---

## 5. Core Value Proposition
- "Understand how AI systems are built, not just what they are"
- "Navigate AI concepts like a connected system, not isolated articles"
- "Find the best external resources without searching the internet"

---

## 6. Core Features (MVP)

### 6.1 Knowledge Pages (Articles)
Each article includes:
- Simple explanation
- Technical explanation
- Real-world example
- When to use
- When NOT to use

---

### 6.2 Concept Relationships
Each article shows:
- Related concepts
- Prerequisites
- Advanced next steps

---

### 6.3 External Resources Section
Each article contains a dedicated section with:
- Documentation links
- Courses
- Videos
- Articles/threads

No duplication of content, only curated references.

---

### 6.4 Navigation System

#### A. Category Navigation
- Core Concepts
- Agents
- Skills
- Rules / Guardrails
- Patterns
- Workflows

#### B. Contextual Navigation
- "Related topics"
- "You may also want to learn"

---

### 6.5 Homepage
The homepage acts as an entry point with:
- Clear positioning message
- Featured concepts
- Suggested learning paths
- Quick access to main categories

---

## 7. Information Architecture

### Categories
- Core Concepts
- Agents
- Skills
- Rules / Guardrails
- Patterns
- Workflows

---

### Example Concept Structure (RAG)
- Explanation (simple)
- Explanation (technical)
- Example
- When to use
- When not to use
- Related concepts
- External resources

---

## 8. UI/UX Principles

### 8.1 Design Goals
- Clean, minimal, distraction-free
- No "marketing" feel
- Fast to scan
- Structured like a knowledge tool, not a blog

---

### 8.2 Layout

#### Page Layout
- Left sidebar → navigation/categories
- Main content → article
- Right sidebar → related concepts + resources

---

### 8.3 Visual Style
- Neutral colors (light/dark mode ready)
- Strong typography hierarchy
- Card-based resource display

---

## 9. Content Strategy

### Tone
- Direct
- Practical
- Non-academic

### Style Example
Instead of:
"An agent is an entity..."

Use:
"An agent is basically an LLM with permission to take actions"

---

## 10. Data Model (High-Level)

### Articles
- id
- title
- slug
- content (markdown)
- summary
- level

### Relations
- from_article
- to_article
- type

### Resources
- title
- type (video, doc, course, etc)
- url
- description

### ArticleResources
- article_id
- resource_id

---

## 11. MVP Content Scope

Initial focus:
- Agents
- Skills
- Rules
- Patterns

Initial articles (~10–15):
- What is an Agent
- Types of Agents
- Skills
- Rules / Guardrails
- RAG
- ReAct
- Tool Usage
- Memory
- Prompt Design
- Workflows

---

## 12. Future Phases (Not MVP)
- Public contributions
- AI-assisted content generation
- Graph visualization
- Personalized learning paths
- MCP-based autonomous updates

---

## 13. Success Criteria
- Users can understand a concept in <5 minutes
- Users navigate to at least 2–3 related pages
- Users click external resources

---

## 14. Key Differentiator

AI Wiki is not:
- A blog
- A tool directory

It is:
> A structured, connected, and curated knowledge system for building with AI


---

# Stitch Prompt — UI Template Generation

Design a **minimalist, modern UI template** for a web-based product called "AI Wiki".

## Context
AI Wiki is a knowledge platform focused on helping developers understand how to build systems with Generative AI (LLMs, agents, skills, rules, workflows).

The product is NOT a blog and NOT a marketing site. It should feel like a **technical knowledge tool**.

---

## Design Principles
- Minimalist
- Clean and distraction-free
- Content-first (UI should not compete with content)
- Fast to scan
- Structured and readable
- Professional but not corporate

---

## Theme
- Default: Light mode (primary)
- Secondary: Dark mode (toggle available)
- Neutral color palette (whites, soft grays, subtle accents)
- Avoid bright or saturated colors

---

## Layout Structure

### Global Layout
- Top navigation bar (minimal)
- Left sidebar (main navigation)
- Main content area (article)
- Right sidebar (contextual information)

---

### 1. Top Navigation Bar
- Logo (AI Wiki)
- Search input (prominent but clean)
- Theme toggle (light/dark)
- Optional: minimal user/profile icon (placeholder)

---

### 2. Left Sidebar (Navigation)
- Collapsible
- Categories:
  - Core Concepts
  - Agents
  - Skills
  - Rules / Guardrails
  - Patterns
  - Workflows

- Each category expands into article links
- Highlight current active page

---

### 3. Main Content Area (Article Page)

Structure:
- Title
- Short summary
- Sections:
  - Simple explanation
  - Technical explanation
  - Real-world example
  - When to use
  - When NOT to use

- Clean typography hierarchy
- Generous spacing
- Code blocks styled cleanly

---

### 4. Right Sidebar (Context Panel)

Sections:

#### Related Concepts
- List of linked concepts

#### Learning Path (optional placeholder)
- "Next recommended topics"

#### External Resources
- Cards or list items for:
  - Documentation
  - Courses
  - Videos

Each resource should include:
- Title
- Type label
- Short description

---

### 5. Homepage

Sections:
- Hero (simple, no marketing language)
  - One sentence describing purpose
- Category shortcuts (cards)
- Featured concepts
- Suggested learning paths (optional simple version)

---

## Components Needed
- Sidebar (collapsible)
- Article layout
- Resource cards
- Tag/label system (for level: basic/intermediate/advanced)
- Search input UI
- Theme toggle

---

## Typography
- Sans-serif
- Strong hierarchy:
  - Large titles
  - Clear section headers
  - Readable body text

---

## Interaction
- Smooth hover states
- Subtle transitions
- No heavy animations

---

## What to Avoid
- Marketing sections (pricing, testimonials, etc.)
- Visual clutter
- Overuse of color
- Dashboard-style complexity

---

## Output Expectation
Generate a **complete UI template layout** (preferably in React / Next.js style) that includes:
- Homepage
- Article page
- Navigation system

Focus on structure and usability over visual flair.

