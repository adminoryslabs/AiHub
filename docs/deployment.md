# Despliegue — AI Hub

> Runbook operativo del despliegue actual: web y API en la VPS compartida de
> OrysLabs, detrás de Traefik. Ya no hay Vercel, NAS ni Fly.io.
> Las decisiones de stack están en `architecture.md`.

---

## Topología de producción

```
aihub.oryslabs.com        → Cloudflare → Traefik → /opt/apps/aihub-web (Next.js standalone)
api-aihub.oryslabs.com    → Cloudflare → Traefik → /opt/apps/aihub     (Express + Meilisearch)
```

- **Traefik** es el único proceso que escucha en `:443` y emite los certificados
  con Let's Encrypt. Ningún contenedor publica puertos.
- **VPS**: Hostinger `srv1906663`, Ubuntu 24.04, `187.127.51.101`, 2 vCPU /
  7.8 GB. Aloja varias aplicaciones de OrysLabs; cada una es un stack aislado
  en `/opt/apps/<slug>/`.
- **PostgreSQL**: un motor compartido en `/opt/infra/data`, un rol y una base
  por aplicación. La API entra por la red `data`.
- **Meilisearch**: sidecar privado del stack de la API, sin Traefik y sin
  puertos publicados.
- **Cloudflare R2**: storage de imágenes (aún sin configurar en producción).

---

## Estructura en la VPS

```
/opt/apps/aihub/                  stack de la API
├── docker-compose.yml            API + Meilisearch + migraciones
├── deploy.sh                     script invocado por GitHub Actions
└── app.env                       variables y secretos (modo 600, NO en el repo)

/opt/apps/aihub-web/              stack de la web
├── docker-compose.yml            solo el servidor Next.js
└── deploy.sh                     script invocado por GitHub Actions
```

Redes Docker: `edge` (Traefik + contenedores ruteables), `data` (PostgreSQL) y
la red privada de cada stack. La web solo usa `edge`; la API usa `edge`,
`data` e `internal`.

---

## Cómo se despliega cada parte

Las imágenes se construyen **en GitHub Actions** y se publican en GHCR. En la
VPS nunca se construye ni se despliega a mano.

| | Web | API |
|---|---|---|
| Workflow | `.github/workflows/publish-web.yml` | `.github/workflows/publish.yml` |
| Disparo | push a `master` con cambios en `packages/web/**`, `packages/shared/**`, `package.json`, `package-lock.json`, `.npmrc`, `turbo.json`, `deploy/web/**` o el propio workflow; `workflow_dispatch` | push a `master` con cambios en `packages/api/**`, `packages/shared/**`, `package.json`, `package-lock.json`, `turbo.json`, `deploy/**` o el propio workflow; `workflow_dispatch` |
| Imagen | `ghcr.io/adminoryslabs/aihub-web:<sha>` y `:latest` | `ghcr.io/adminoryslabs/aihub-app:<sha>` y `:latest` |
| Compose | `deploy/web/docker-compose.yml` | `deploy/docker-compose.yml` |
| Carpeta | `/opt/apps/aihub-web` | `/opt/apps/aihub` |
| Dominio | `aihub.oryslabs.com` | `api-aihub.oryslabs.com` |

Cada workflow tiene su propia `concurrency` y su propio `deploy.sh`: un deploy
de la web no reinicia la API y viceversa.

### Build de la web

`packages/web/Dockerfile` es multi-stage sobre `node:22-alpine`:

1. `deps` instala solo el workspace `@ai-hub/web` con `npm ci`. El token de
   GitHub Packages entra como secreto de BuildKit (`id=npm_token`) para bajar
   `@adminoryslabs/design-system`; nunca queda en un `ENV`, un `ARG` ni una
   capa.
2. `build` compila Next con `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_SITE_URL`
   como build args. Esas variables se inlinean en el bundle: si cambian, hay
   que reconstruir la imagen, no alcanza con reiniciar el contenedor.
3. `runner` copia solo la salida standalone, corre como usuario no root
   (uid 1001) y expone `:3000` únicamente dentro de la red Docker.

La API mantiene su `packages/api/Dockerfile` (`node:20-alpine`) y su propio
stack con Meilisearch y el servicio de migraciones.

---

## Setup inicial (una sola vez)

### 1. DNS (Cloudflare, zona `oryslabs.com`)

| Registro | Tipo | Valor |
|---|---|---|
| `aihub` | A | `187.127.51.101` |
| `api-aihub` | A | `187.127.51.101` |

No crear registros `AAAA`: el host tiene IPv6 pero Docker no lo enruta. La web
puede quedar proxied; no hay websockets de larga duración.

### 2. Carpetas en la VPS

```bash
mkdir -p /opt/apps/aihub-web
```

`/opt/apps/aihub/` ya existe con el stack de la API. El `scp` y el `cd` de cada
`deploy.sh` requieren que la carpeta exista.

### 3. Secretos del repositorio (GitHub Actions)

| Secreto | Uso |
|---|---|
| `VPS_SSH_KEY` | Clave de despliegue de GitHub Actions |
| `VPS_HOST` | `187.127.51.101` |
| `VPS_USER` | `root` |
| `NPM_TOKEN` | Token de GitHub Packages con `read:packages`, para instalar el design system en el build de la web |

`VPS_SSH_KEY`, `VPS_HOST` y `VPS_USER` ya existen para el deploy de la API y se
reutilizan para la web. La clave de despliegue se genera en la VPS y su mitad
privada se carga directamente en el secreto, sin imprimirla ni guardarla en el
repositorio.

### 4. Variables del repositorio (GitHub Actions)

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api-aihub.oryslabs.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://aihub.oryslabs.com` |

### 5. Variables de la API

En `/opt/apps/aihub/app.env` (modo 600):

- `CORS_ORIGIN` debe incluir exactamente `https://aihub.oryslabs.com`.
- El resto de las variables no cambia por el despliegue de la web.

---

## Operaciones del día a día

### Deploy

`git push origin master` con cambios en las rutas que filtra cada workflow.
GitHub Actions construye, publica en GHCR y ejecuta el `deploy.sh` por SSH.

### Ver logs

```bash
# Web
cd /opt/apps/aihub-web && docker compose logs -f app

# API
cd /opt/apps/aihub && docker compose logs -f app
cd /opt/apps/aihub && docker compose logs -f meilisearch
```

### Estado y salud

```bash
cd /opt/apps/aihub-web && docker compose ps
curl -fsS https://aihub.oryslabs.com/api/health

cd /opt/apps/aihub && docker compose ps
curl -fsS https://api-aihub.oryslabs.com/api/v1/health
```

### Reiniciar un servicio

Reiniciar un contenedor para aliviar una operación no es un deploy:

```bash
cd /opt/apps/aihub-web && docker compose restart app
cd /opt/apps/aihub && docker compose restart app
```

### Acceder a PostgreSQL

El motor compartido se publica solo en loopback (`127.0.0.1:5432`), nunca en la
interfaz pública. Para una GUI o `psql`, abrir un túnel SSH:

```bash
ssh -L 5432:127.0.0.1:5432 root@187.127.51.101
```

y autenticar con el rol de AI Hub.

---

## Design system, fuentes e íconos

- Los estilos vienen de `@adminoryslabs/design-system` (v2.2.0): el preset de
  Tailwind (clases `orys-*`), el CSS de tokens y el script anti-parpadeo
  `theme-init`. El tema se expresa con `data-theme` y `data-line="academy"` en
  `<html>`.
- **No se usa Google Fonts.** Las fuentes (Inter y JetBrains Mono) las sirve el
  propio paquete vía `@adminoryslabs/design-system/fonts`, dentro del bundle.
  No hay `@import` a `fonts.googleapis.com` ni `fonts.gstatic.com`.
- Los íconos son **Lucide** (`lucide-react`, trazo 1.75, `currentColor`), a
  través de `components/ui/Icon.tsx`. No se usa Material Symbols.
- El tema por defecto es claro (`data-theme="light"`) y el visitante puede
  cambiarlo con el toggle; la preferencia se guarda en `localStorage`.

---

## Troubleshooting

### Traefik no ve ningún contenedor

Síntoma: `curl` devuelve `000`, el certificado servido es
`TRAEFIK DEFAULT CERT` y el log de Traefik repite `client version 1.24 is too
old. Minimum supported API version is 1.40`.

Causa: Docker Engine 29 rechaza clientes por debajo de la API 1.40. Traefik
tiene que ser `v3.7.10` o superior. Definir `DOCKER_API_VERSION` en el
contenedor no lo arregla.

### El healthcheck nunca pasa a `healthy`

Los healthchecks usan `127.0.0.1`, nunca `localhost`: BusyBox resuelve
`localhost` a `::1` y el proceso escucha solo en IPv4.

### El deploy muere a mitad del pull con `Broken pipe`

Mantener los keepalives SSH (`ServerAliveInterval`, `ServerAliveCountMax`,
`TCPKeepAlive`) y no usar `docker compose pull --quiet`.

### La web apunta a la API equivocada

`NEXT_PUBLIC_*` se hornea en build. Corregir `vars.NEXT_PUBLIC_API_URL` en
GitHub y volver a correr el workflow; reiniciar el contenedor no alcanza.

### Falla la instalación del design system en CI

El build usa `secrets.NPM_TOKEN` como secreto de BuildKit. Verificar que el
token exista, tenga `read:packages` y pueda leer
`@adminoryslabs/design-system`.

### La web no conecta con la API desde el navegador

- Verificar que `NEXT_PUBLIC_API_URL` en el build sea
  `https://api-aihub.oryslabs.com`.
- Verificar que `CORS_ORIGIN` en `/opt/apps/aihub/app.env` sea exactamente
  `https://aihub.oryslabs.com`.

### Logs y rotación

Los dos stacks usan el driver `json-file` con `max-size: 10m` y `max-file: 3`.

---

## Historial

- **Hasta 2026-08-16**: API, PostgreSQL y Meilisearch en un NAS doméstico,
  expuestos por Cloudflare Tunnel; frontend en Vercel.
- **2026-08-16**: la API, PostgreSQL y Meilisearch se mudaron a la VPS
  compartida de OrysLabs.
- **2026-11**: la web pasó de Vercel a la VPS compartida como stack propio
  (`/opt/apps/aihub-web`), con imagen `ghcr.io/adminoryslabs/aihub-web` y
  salida standalone de Next.js.
