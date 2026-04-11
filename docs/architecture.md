# Architecture Decisions — AI Hub

> Decisiones técnicas de alto nivel tomadas durante la fase de definición.
> Este documento es input directo para la fase `sdd-design`.
> No cubre implementación — eso vive en `design.md` del SDD.

---

## Stack

| Capa | Tecnología | Alternativa descartada | Razón de la elección |
|------|-----------|----------------------|---------------------|
| **Frontend** | Next.js | React + Vite | SSR nativo obligatorio para SEO. Vite requiere configuración manual de SSR para el mismo resultado. |
| **Backend** | Express (Node.js) | Next.js API routes | API routes son serverless — no escalan bien con background jobs, agentes editoriales y pipelines que vienen en fases posteriores. Express escala independientemente y el equipo lo conoce. |
| **Base de datos** | PostgreSQL vía NeonDB | Supabase | NeonDB es PostgreSQL puro sin extras innecesarios. Branching para dev/staging, scale to zero, sin vendor lock-in. Supabase ofrece Auth/Storage/Realtime que no se usan en este proyecto. |
| **Motor de búsqueda** | Meilisearch | Elasticsearch, Algolia | Meilisearch: self-hostable, fácil de operar, full-text con tolerancia a typos, sinónimos configurables. Elasticsearch es excesivo para este volumen. Algolia es gestionado pero costoso a escala. |
| **Storage de imágenes** | Cloudflare R2 | AWS S3, GCS | Compatible con S3. Sin costo de egress — crítico cuando el tráfico es impredecible en las primeras etapas. |

---

## Arquitectura

```
┌──────────────────────────────────────────────┐
│              Vercel (CDN global)             │
│         Next.js — frontend público           │
│              + panel de admin                │
│           (SSR / SSG, sin API routes)        │
└─────────────────────┬────────────────────────┘
                      │ HTTP (REST)
┌─────────────────────▼────────────────────────┐
│              Fly.io                          │
│           Express API                        │
│     (lógica de negocio, auth, jobs)          │
└──────────┬───────────────────────────────────┘
           │
  ┌────────┼────────────────┐
  │        │                │
┌─▼──────┐ ┌▼────────────┐ ┌▼─────────────┐
│ NeonDB │ │ Meilisearch │ │Cloudflare R2 │
│Postgres│ │   Cloud     │ │   (images)   │
└────────┘ └─────────────┘ └──────────────┘
```

**Dos superficies, una API:**
- El sitio público (lectores) y el panel de admin comparten el mismo backend Express.
- La distinción es de autenticación y rutas — no de servicios separados.

---

## Despliegue — path de costos

### MVP (~$0/mes)

| Servicio | Plan | Límite relevante |
|----------|------|-----------------|
| Vercel | Free | 100GB bandwidth/mes |
| Fly.io | Free | 3 VMs 256MB RAM |
| NeonDB | Free | 0.5GB storage |
| Meilisearch Cloud | Free | 10k documentos |
| Cloudflare R2 | Free | 10GB storage, sin egress |

### Cuando escala (~€10-15/mes)

Trigger: Meilisearch supera 10k docs, o Express necesita más RAM.

Movimiento: un único Hetzner VPS (€4-6/mes) corre Express + Meilisearch self-hosted.
NeonDB y Vercel continúan en sus planes o se migran según volumen.

---

## Principios de diseño técnico

- **Separación real de frontend y backend.** Next.js no contiene lógica de negocio — solo rendering y llamadas a la API.
- **La API es la fuente de verdad.** Tanto el sitio público como el panel de admin consumen la misma API Express. No hay lógica duplicada entre superficies.
- **Preparado para agentes, no activado.** La arquitectura del backend debe soportar background jobs y pipelines de agentes IA desde el día uno, aunque no se activen en el MVP.
- **SEO no es opcional.** Toda página pública de artículo debe ser SSR o SSG. Ninguna ruta de contenido puede ser client-side only.
- **Búsqueda semántica en Fase 2.** Meilisearch con sinónimos cubre el MVP. La capa de embeddings vectoriales se añade encima sin cambiar la arquitectura base.
