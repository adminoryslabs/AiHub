# Despliegue — AI Hub

> Runbook operativo para el despliegue híbrido (Vercel + NAS).
> Stack y razonamiento en `architecture.md` (sección "Revisión 2026-05-04").

---

## Topología de producción

```
aihub.oryslabs.com           → Vercel (Next.js: SSG/ISR/SSR)
api-aihub.oryslabs.com       → Cloudflare Tunnel → NAS:3010 (Express API)
```

Stack en NAS (`/volume1/docker/aihub/`):

- **Postgres 16-alpine** — DB principal, no expuesta al host
- **Meilisearch v1.11** — motor de búsqueda, no expuesto al host
- **API Express** — expone `127.0.0.1:3010` (solo accesible desde el host del NAS, leído por cloudflared en network_mode host)

Storage (Cloudflare R2) y frontend (Vercel) siguen el doc de arquitectura original.

---

## CI/CD — patrón heredado de `oryslabs-landing`

**Sin registry.** Disparo:

```
push a master (GitHub)
  → GitHub Actions runner (ubuntu-latest)
  → SSH al NAS vía Cloudflare Access ZeroTrust (host: ssh-nas.knowflare.com)
  → ejecuta sudo /volume1/docker/aihub/deploy.sh
  → git pull → docker compose build → migrations → up -d → healthcheck
```

Workflow: `.github/workflows/deploy.yml` (filtrado a cambios en `packages/api/**`, `packages/shared/**`, `package-lock.json`, `turbo.json`).

---

## Estructura en el NAS

```
/volume1/docker/aihub/
├── docker-compose.yml         # Postgres + Meili + api
├── .env                       # secretos (permisos 600, NO commit)
├── deploy.sh                  # script disparado por GitHub Actions
├── deploy_key                 # privada, lee del repo (read-only)
├── deploy_key.pub             # subida a GitHub Deploy Keys
├── nas_runner_key             # privada, queda local — la pública va a authorized_keys
├── nas_runner_key.pub         # añadida a ~/.ssh/authorized_keys del NAS
├── codigo/                    # clon git del repo (creado en primer deploy)
├── postgres_data/             # volumen Postgres (bind mount)
└── meilisearch_data/          # volumen Meilisearch (bind mount)
```

---

## Setup inicial (una sola vez)

### 1. GitHub — Deploy Key (pull del repo)

Repo: `adminoryslabs/AiHub` → **Settings → Deploy keys → Add deploy key**:

- **Title**: `aihub-nas-pull`
- **Key**: contenido de `/volume1/docker/aihub/deploy_key.pub`
- **Allow write access**: ❌ NO

### 2. GitHub — Secrets para Actions

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|---|---|
| `NAS_SSH_KEY` | Contenido completo de `/volume1/docker/aihub/nas_runner_key` (la **privada**, incluye `-----BEGIN`/`-----END`) |
| `NAS_USER` | `otc-admin` |
| `NAS_HOST` | `ssh-nas.knowflare.com` |

### 3. Cloudflare — DNS

En el dashboard de Cloudflare para `oryslabs.com`:

- **CNAME** `aihub` → `cname.vercel-dns.com` (o el target que indique Vercel al añadir el dominio custom)
- **CNAME** `api-aihub` → `<tunnel-id>.cfargotunnel.com` (lo añade automáticamente CF Zero Trust al crear el Public Hostname del paso siguiente)

### 4. Cloudflare Zero Trust — Public Hostname

**Networks → Tunnels → cloudflared-oryslabs → Public Hostnames → Add a public hostname**:

- **Subdomain**: `api-aihub`
- **Domain**: `oryslabs.com`
- **Service Type**: `HTTP`
- **URL**: `localhost:3010`

Esto crea automáticamente el CNAME en DNS.

### 5. Cloudflare Access — verificar policy SSH

El host `ssh-nas.knowflare.com` ya está configurado para `oryslabs-landing`. Verificar con el dueño del NAS que el policy de Access permita autenticación desde el nuevo workflow de GitHub Actions (típicamente con `Service Token` o email-based + workflow auth).

### 6. NAS — sudoers para deploy.sh

`otc-admin` necesita poder ejecutar `deploy.sh` con `sudo` sin password:

```bash
# Como root (o usar ssh con sudo si está configurado para landing y replicar línea):
sudo visudo -f /etc/sudoers.d/aihub-deploy
# contenido:
otc-admin ALL=(ALL) NOPASSWD: /volume1/docker/aihub/deploy.sh
```

**Estado**: por verificar con Mario/su amigo si el patrón actual ya cubre esto o necesita línea nueva.

### 7. Primer clone del repo (manual una vez)

Tras subir la deploy_key a GitHub:

```bash
ssh nas
cd /volume1/docker/aihub
GIT_SSH_COMMAND="ssh -i ./deploy_key -o StrictHostKeyChecking=no" \
  git clone git@github.com:adminoryslabs/AiHub.git codigo
```

### 8. Primera levantada del stack

```bash
ssh nas
cd /volume1/docker/aihub
docker compose --env-file .env up -d
docker compose logs -f api
```

### 9. Vercel — frontend

- Conectar repo `adminoryslabs/AiHub` a Vercel.
- **Root Directory**: `packages/web`.
- **Build Command**: `npm run build --workspace=@ai-hub/web`.
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL=https://api-aihub.oryslabs.com`
- Añadir dominio custom: `aihub.oryslabs.com`.

---

## Operaciones del día a día

### Deploy normal

`git push origin master` con cambios en `packages/api/**` o `packages/shared/**`.
GitHub Actions se encarga del resto.

### Ver logs

```bash
ssh nas
cd /volume1/docker/aihub
docker compose logs -f api          # api
docker compose logs -f postgres     # postgres
docker compose logs --tail=200 api  # últimas 200 líneas
```

### Reiniciar servicios

```bash
docker compose restart api          # solo api
docker compose down && docker compose up -d  # reset completo
```

### Acceder a la DB

```bash
ssh nas
cd /volume1/docker/aihub
docker compose exec postgres psql -U aihub -d aihub
```

### Backup manual de DB

```bash
ssh nas
cd /volume1/docker/aihub
docker compose exec -T postgres pg_dump -U aihub aihub | \
  gzip > /volume1/Respaldo_Mac/aihub-backup-$(date +%Y%m%d-%H%M).sql.gz
```

### Restaurar backup

```bash
gunzip -c /volume1/Respaldo_Mac/aihub-backup-FECHA.sql.gz | \
  docker compose exec -T postgres psql -U aihub -d aihub
```

### Backups automáticos

Crear tarea en **DSM → Control Panel → Task Scheduler** (User-defined script, daily 03:00):

```sh
docker exec aihub-postgres pg_dump -U aihub aihub | \
  gzip > /volume1/Respaldo_Mac/aihub/backup-$(date +%Y%m%d).sql.gz
find /volume1/Respaldo_Mac/aihub/ -name "backup-*.sql.gz" -mtime +30 -delete
```

---

## Troubleshooting

### El api no levanta tras deploy

```bash
ssh nas
cd /volume1/docker/aihub
docker compose logs --tail=100 api
```

Causas comunes:
- Error de migración → revisar `migrations/*.sql`.
- Variable de entorno faltante → revisar `.env` vs `packages/api/.env.example`.
- Postgres no listo → comprobar `docker compose ps`, healthcheck debe ser `healthy`.

### `api-aihub.oryslabs.com` da 502

- Verificar que `aihub-api` esté `Up` y `healthy`: `docker compose ps`.
- Verificar que el puerto 3010 esté libre: `netstat -tln | grep 3010`.
- Verificar Public Hostname en Cloudflare Zero Trust dashboard.

### Migraciones fallan en deploy

El deploy.sh es **idempotente** sobre las migraciones (errores de "ya existe" se ignoran). Si fallan por otra razón, ejecutar manualmente:

```bash
ssh nas
cd /volume1/docker/aihub
docker compose exec -T postgres psql -U aihub -d aihub < codigo/packages/api/migrations/001_initial_schema.sql
```

### Frontend en Vercel no conecta con la api

- Verificar que `NEXT_PUBLIC_API_URL` apunta a `https://api-aihub.oryslabs.com` en Vercel.
- Verificar CORS: `CORS_ORIGIN` en `.env` del NAS debe incluir `https://aihub.oryslabs.com`.

---

## Monitoreo

- **Uptime Kuma** (ya corriendo en NAS): añadir monitor HTTP a `https://api-aihub.oryslabs.com/api/v1/health` con check cada 1 min.
- **Logs**: rotación configurada en compose (max 10MB × 3 archivos por servicio).
