# Architecture Decisions — AI Hub

> Decisiones técnicas de alto nivel tomadas durante la fase de definición.
> Este documento es input directo para la fase `sdd-design`.
> No cubre implementación — eso vive en `design.md` del SDD.

---

## Stack

| Capa | Tecnología | Alternativa descartada | Razón de la elección |
|------|-----------|----------------------|---------------------|
| **Frontend** | Next.js (SSR/SSG) en la VPS compartida, salida standalone en Docker | React + Vite | SSR nativo obligatorio para SEO. Vite requiere configuración manual de SSR para el mismo resultado. |
| **Backend** | Express (Node.js) en la VPS compartida (Docker) | Next.js API routes | API routes son serverless — no escalan bien con background jobs, agentes editoriales y pipelines que vienen en fases posteriores. Express escala independientemente y el equipo lo conoce. |
| **Base de datos** | PostgreSQL en la VPS compartida (motor compartido, un rol y una base por aplicación) | Supabase | PostgreSQL puro sin extras innecesarios. Supabase ofrece Auth/Storage/Realtime que no se usan en este proyecto. |
| **Motor de búsqueda** | Meilisearch (sidecar privado en la VPS) | Elasticsearch, Algolia | Meilisearch: self-hostable, fácil de operar, full-text con tolerancia a typos, sinónimos configurables. Elasticsearch es excesivo para este volumen. Algolia es gestionado pero costoso a escala. |
| **Storage de imágenes** | Cloudflare R2 | AWS S3, GCS | Compatible con S3. Sin costo de egress — crítico cuando el tráfico es impredecible en las primeras etapas. |

---

## Arquitectura

```
                  Internet
                     │
                     ▼
        Cloudflare DNS (aihub / api-aihub)
                     │
                     ▼
     ┌─────────────────────────────────────────┐
     │   VPS compartida OrysLabs (Hostinger)   │
     │   Traefik (único :443, ACME)            │
     │  ┌───────────────────────────────────┐  │
     │  │ /opt/apps/aihub-web/              │  │
     │  │  Next.js standalone ── red `edge` │  │
     │  └───────────────────────────────────┘  │
     │  ┌───────────────────────────────────┐  │
     │  │ /opt/apps/aihub/                  │  │
     │  │  Express API  ── red `edge`       │  │
     │  │  Meilisearch  ── red privada      │  │
     │  └───────────────────────────────────┘  │
     │  ┌───────────────────────────────────┐  │
     │  │ PostgreSQL compartido ── red `data`│  │
     │  └───────────────────────────────────┘  │
     └─────────────────────────────────────────┘
                     │
                     ▼
             Cloudflare R2 (imágenes)
```

**Dos superficies, una API:**
- El sitio público (lectores) y el panel de admin comparten el mismo backend Express.
- La web llama a la API por su URL pública (`https://api-aihub.oryslabs.com`), no por la red interna.

---

## Despliegue

Las dos partes corren en la VPS compartida de OrysLabs, cada una como stack
Docker propio detrás de Traefik. Detalle operativo en `deployment.md`.

| Pieza | Imagen | Carpeta en la VPS | Workflow |
|---|---|---|---|
| Web (Next.js standalone) | `ghcr.io/adminoryslabs/aihub-web` | `/opt/apps/aihub-web` | `publish-web.yml` |
| API (Express) | `ghcr.io/adminoryslabs/aihub-app` | `/opt/apps/aihub` | `publish.yml` |

Las imágenes se construyen en GitHub Actions y se publican en GHCR; la VPS solo
las baja. Ningún contenedor publica puertos: Traefik es la única entrada.

### Design system

La web usa `@adminoryslabs/design-system` v2.2.0: preset de Tailwind (`orys-*`),
CSS de tokens, script `theme-init` y fuentes servidas desde el propio paquete
(Inter y JetBrains Mono). **No se usa Google Fonts.** Los íconos son **Lucide**
(`lucide-react`) a través de `components/ui/Icon.tsx`.

---

## Revisión 2026-11 — Web y API en la VPS compartida OrysLabs

> **Esta sección reemplaza a "Revisión 2026-05-04" como estado actual del despliegue.**
> Esa sección se conserva más abajo solo como historial de la decisión original; el backend, PostgreSQL, Meilisearch y la web **ya no viven en el NAS ni en Vercel**.

### Motivo del cambio

OrysLabs pasó a operar una VPS compartida (Hostinger, `187.127.51.101`) para todas sus aplicaciones, con Traefik como único punto de entrada y un motor PostgreSQL compartido (una base y un rol por aplicación). En agosto de 2026 se movieron la API, PostgreSQL y Meilisearch; en noviembre de 2026 se movió también la web, que hasta entonces servía Vercel desde `packages/web`. La web corre ahora como un stack Docker independiente con la salida standalone de Next.js, para dejar de depender de Vercel y tener web y API bajo el mismo mecanismo de despliegue.

### Stack actual

| Capa | Actual (VPS) |
|------|--------------|
| Frontend | **VPS compartida** (Next.js standalone en Docker, `/opt/apps/aihub-web`) |
| Backend Express | **VPS compartida** (Docker Compose, detrás de Traefik) |
| PostgreSQL | **VPS compartida** (motor Postgres compartido, base `aihub` propia) |
| Meilisearch | **VPS compartida** (sidecar privado, solo alcanzable desde el backend) |
| Storage de imágenes | **Cloudflare R2** (aún no configurado en producción) |

### Arquitectura actual

```
                  Internet
                     │
                     ▼
        Cloudflare DNS (aihub / api-aihub)
                     │
                     ▼
     ┌─────────────────────────────────────────┐
     │   VPS compartida OrysLabs (Hostinger)   │
     │   Traefik (único :443, ACME)            │
     │  ┌───────────────────────────────────┐  │
     │  │ /opt/apps/aihub-web/              │  │
     │  │  Next.js standalone ── red `edge` │  │
     │  └───────────────────────────────────┘  │
     │  ┌───────────────────────────────────┐  │
     │  │ /opt/apps/aihub/                  │  │
     │  │  Express API  ── red `edge`       │  │
     │  │  Meilisearch  ── red privada      │  │
     │  └───────────────────────────────────┘  │
     │  ┌───────────────────────────────────┐  │
     │  │ PostgreSQL compartido ── red `data`│  │
     │  └───────────────────────────────────┘  │
     └─────────────────────────────────────────┘
```

CI/CD: `.github/workflows/publish.yml` construye y publica `ghcr.io/adminoryslabs/aihub-app` (API); `.github/workflows/publish-web.yml` hace lo propio con `ghcr.io/adminoryslabs/aihub-web` (web). Cada uno despliega por SSH ejecutando su `deploy.sh` en la VPS — build y deploy nunca ocurren a mano ni sobre la VPS misma.

### Limitaciones aceptadas

- La VPS es compartida con otras aplicaciones de OrysLabs (2 vCPU / 7.8GB RAM totales) — AI Hub declara límites de recursos por contenedor para no acaparar el host.
- Backups de Postgres: responsabilidad del operador de la VPS compartida, no hay automatización propia todavía documentada acá.
- Sin CDN de Vercel, el TTFB del SSR depende de la VPS y de Cloudflare como proxy. El caché ISR vive en el filesystem efímero del contenedor: se pierde en cada redeploy y no se comparte entre réplicas (hoy hay una sola).

### Impacto en el diseño

Sin cambios: el diseño de aplicación no depende de dónde corre cada parte. Postgres y Meilisearch le hablan al backend por red de contenedor; la web llama a la API por su URL pública. Solo cambian las variables de entorno y el mecanismo de despliegue.

---

## Revisión 2026-05-04 — Opción provisional: despliegue híbrido en NAS (histórico, superado)

> **Superada por la migración a la VPS compartida documentada arriba.** Se conserva como registro de la decisión original; el backend ya no corre en el NAS.

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
