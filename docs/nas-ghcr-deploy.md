# Deploy del API vía GHCR

Este flujo evita construir la imagen Docker del API en la NAS.

## Flujo

1. GitHub Actions construye `packages/api/Dockerfile`.
2. GitHub Actions publica:
   - `ghcr.io/adminoryslabs/aihub-api:latest`
   - `ghcr.io/adminoryslabs/aihub-api:<commit-sha>`
3. La NAS ejecuta `deploy.sh`.
4. La NAS hace `docker compose pull api`.
5. La NAS aplica migraciones desde la imagen nueva.
6. La NAS reinicia solo el servicio `api`.

## Setup único en la NAS

La NAS debe poder leer el paquete en GHCR.

```bash
echo "$GHCR_TOKEN" | /usr/local/bin/docker login ghcr.io -u TU_USUARIO_GITHUB --password-stdin
```

El token necesita permiso `read:packages`.

## Archivos de referencia

- `infra/nas/docker-compose.yml`
- `infra/nas/deploy.sh`

Estos archivos deben sincronizarse manualmente a:

- `/volume1/docker/aihub/docker-compose.yml`
- `/volume1/docker/aihub/deploy.sh`

## Deploy manual

```bash
ssh nas 'cd /volume1/docker/aihub && ./deploy.sh && /usr/local/bin/docker compose --env-file .env ps'
```

## Verificación

```bash
ssh nas 'cd /volume1/docker/aihub && /usr/local/bin/docker compose --env-file .env ps && wget -qO- http://127.0.0.1:3010/api/v1/health'
curl -fsS https://api-aihub.oryslabs.com/api/v1/health
```
