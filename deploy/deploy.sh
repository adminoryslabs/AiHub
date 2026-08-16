#!/usr/bin/env bash
# Deploy de aihub en la VPS. Invocado por GitHub Actions vía SSH.
#
# El token del registry llega por STDIN para que nunca aparezca en un
# comando, un process list ni el historial remoto. POR ESO es un archivo
# y no un heredoc: stdin ya está ocupado por el token.
#
#   IMAGE_TAG=<sha> ACTOR=<github-user> bash deploy.sh  < token
set -euo pipefail

: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${ACTOR:?ACTOR is required}"

cd "/opt/apps/aihub"
export IMAGE_TAG

docker login ghcr.io -u "$ACTOR" --password-stdin
trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT

# Sin --quiet a propósito: un pull silencioso puede dejar la conexión SSH
# sin tráfico por minutos y algo en el camino la corta.
echo "==> pulling $IMAGE_TAG"
docker compose pull

# Corre las migraciones hasta el final antes de que nada sirva tráfico.
# No-op inofensivo si el stack no declara un servicio `migrate`.
if docker compose config --services | grep -qx migrate; then
  echo "==> migrating"
  docker compose run --rm migrate
fi

echo "==> starting"
mapfile -t SERVICES < <(docker compose config --services | grep -vx migrate)
docker compose up -d --remove-orphans "${SERVICES[@]}"

echo "==> waiting for health"
unhealthy=""
for _ in $(seq 1 30); do
  unhealthy=$(docker compose ps --format '{{.Service}} {{.Health}}' \
    | awk '$1 != "migrate" && $2 != "healthy" {print $1}' | tr '\n' ' ')
  [ -z "$unhealthy" ] && break
  sleep 5
done

if [ -n "$unhealthy" ]; then
  echo "still unhealthy after 150s: $unhealthy"
  docker compose ps
  # shellcheck disable=SC2086
  docker compose logs --tail 40 $unhealthy
  exit 1
fi

docker compose ps --format '{{.Service}}\t{{.Image}}\t{{.Status}}'
docker image prune -f >/dev/null
echo "==> deployed $IMAGE_TAG"
