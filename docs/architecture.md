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

## Revisión 2026-05-04 — Opción provisional: despliegue híbrido en NAS

> **Esta sección no reemplaza al stack definido arriba — lo complementa.**
> El stack arriba (Vercel + Fly.io + Neon + Meilisearch Cloud + R2) sigue siendo el destino objetivo cuando el proyecto justifique los costos cloud.
> Esta opción provisional aplica **mientras AIHub no genere ingresos**.

### Contexto del cambio

Al revisar el path de costos del MVP en mayo 2026 se detectaron dos rupturas respecto al doc original:

1. **Fly.io eliminó su free tier** (octubre 2024). Hoy requiere tarjeta y un mínimo de pago — ~$2-5/mes para una API pequeña.
2. **Meilisearch Cloud no tiene free tier permanente** — solo 14 días de trial. El plan más barato ("Build") parte en $30/mes.

Adicionalmente, OrysLabs dispone de un **Synology NAS DS225+** propio en producción (uptime sostenido, UPS, sin costos marginales) ya usado para servir `oryslabs.com` mediante Cloudflare Tunnel. AIHub puede aprovechar la misma infraestructura.

### Stack provisional

| Capa | Provisional (NAS) | Destino objetivo (cloud) |
|------|-------------------|--------------------------|
| Frontend | **Vercel** (sin cambio) | Vercel |
| Backend Express | **NAS** (Docker Compose, expuesto vía Cloudflare Tunnel) | Fly.io |
| PostgreSQL | **NAS** (contenedor Postgres dedicado, junto al backend) | Neon |
| Meilisearch | **NAS** (contenedor self-hosted) | Meilisearch Cloud |
| Storage de imágenes | **Cloudflare R2** (sin cambio) | Cloudflare R2 |

### Arquitectura provisional

```
                  Internet
                     │
                     ▼
     ┌───────────────────────────────┐
     │     aihub.oryslabs.com        │ ← DNS Cloudflare → Vercel
     └───────────────────────────────┘
                     │
                     ▼
              [ Vercel: Next.js ]
              SSG / ISR / SSR
                     │
                     │ fetch HTTPS
                     ▼
     ┌───────────────────────────────┐
     │  api-aihub.oryslabs.com       │ ← DNS Cloudflare → Cloudflare Tunnel
     └───────────────────────────────┘
                     │
                     ▼
            [ Cloudflare Tunnel ]
                     │
                     ▼
       ┌─────────────────────────┐
       │      NAS (Synology)     │
       │  /volume1/docker/aihub/ │
       │  ┌───────────────────┐  │
       │  │  Express API      │  │
       │  │  PostgreSQL       │  │
       │  │  Meilisearch      │  │
       │  └───────────────────┘  │
       └─────────────────────────┘
```

### Decisión costos

| Componente | Provisional NAS | Destino cloud |
|-----------|-----------------|---------------|
| Vercel Hobby | $0 | $0 (o $20 Pro si requiere uso comercial explícito) |
| Backend + DB + Meili | $0 (NAS preexistente) | ~$5 Fly.io + $0 Neon free + $30 Meili Build = **~$35/mes mínimo** |
| Cloudflare R2 | $0 | $0 |
| **Total mensual** | **$0** | **~$35-55** |

### Triggers para migrar al stack cloud

La migración al stack objetivo (Fly.io + Neon + Meili Cloud) debe gatillarse cuando se cumpla **al menos uno**:

1. AIHub genera ingresos que justifican infraestructura propia ($30-50/mes amortizables).
2. La carga en el NAS supera el 70% sostenido de CPU/RAM/IO o impacta otros servicios de OrysLabs.
3. Se requiere uptime garantizado (SLA con sponsors, partners institucionales).
4. El equipo crece y la operación del NAS deja de ser viable individualmente.
5. Cualquier requerimiento que el NAS no pueda satisfacer (escalado horizontal, regiones múltiples, etc.).

### Limitaciones aceptadas en la opción provisional

- **Disponibilidad sujeta a la NAS y la red del hogar** donde reside. UPS protege contra cortes cortos; cortes largos o fallos de ISP son ventana de indisponibilidad.
- **Mitigación**: el frontend en Vercel con ISR continúa sirviendo páginas pre-renderizadas durante caídas del backend. SEO no se daña por caídas cortas. La indisponibilidad se siente solo en datos frescos y panel admin.
- **Backups**: responsabilidad propia. `pg_dump` programado con retención mínima 30 días en `/volume1` + snapshot Synology.
- **Monitoreo**: Uptime Kuma (ya presente en el NAS) debe vigilar `api-aihub.oryslabs.com` y alertar.

### Impacto en el diseño

El diseño de aplicación **no cambia** entre opción provisional y destino cloud — solo cambia el plano de despliegue:

- El backend Express se levanta igual con `docker-compose`.
- Postgres y Meilisearch hablan al backend por red de contenedor (provisional) o por endpoint cloud (destino) — el código solo cambia variables de entorno.
- La migración futura es un trabajo de DevOps acotado, no un rediseño.

---

## Principios de diseño técnico

- **Separación real de frontend y backend.** Next.js no contiene lógica de negocio — solo rendering y llamadas a la API.
- **La API es la fuente de verdad.** Tanto el sitio público como el panel de admin consumen la misma API Express. No hay lógica duplicada entre superficies.
- **Preparado para agentes, no activado.** La arquitectura del backend debe soportar background jobs y pipelines de agentes IA desde el día uno, aunque no se activen en el MVP.
- **SEO no es opcional.** Toda página pública de artículo debe ser SSR o SSG. Ninguna ruta de contenido puede ser client-side only.
- **Búsqueda semántica en Fase 2.** Meilisearch con sinónimos cubre el MVP. La capa de embeddings vectoriales se añade encima sin cambiar la arquitectura base.
