#!/bin/sh
# AI Hub — deploy ligero en NAS usando imagen preconstruida en GHCR.
set -e

PROJECT_DIR=/volume1/docker/aihub
CODE_DIR=$PROJECT_DIR/codigo
DEPLOY_KEY=$PROJECT_DIR/deploy_key

cd "$PROJECT_DIR"

echo "==> [1/5] Pull del código desde master"
cd "$CODE_DIR"
git -c core.sshCommand="ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=no" pull origin master

echo "==> [2/5] Descargar imagen api preconstruida"
cd "$PROJECT_DIR"
/usr/local/bin/docker compose --env-file .env pull api

echo "==> [3/5] Aplicar migraciones de DB"
/usr/local/bin/docker compose --env-file .env run --rm --no-deps --entrypoint="" api \
  sh -c 'set -e; for f in /app/packages/api/migrations/*.sql; do echo "aplicando $(basename "$f")"; psql "$DATABASE_URL" -f "$f"; done'

echo "==> [4/5] Levantar nueva versión del api"
/usr/local/bin/docker compose --env-file .env up -d --no-deps api

echo "==> [5/5] Healthcheck"
sleep 5
for i in 1 2 3 4 5 6 7 8; do
  if /usr/local/bin/docker compose exec -T api wget -q --spider http://localhost:3000/api/v1/health; then
    echo "OK — api respondiendo a /api/v1/health"
    echo "Deploy completado: $(date)"
    exit 0
  fi
  echo "Esperando api... intento $i/8"
  sleep 10
done

echo "ERROR: api no respondió a /api/v1/health tras el deploy"
/usr/local/bin/docker compose --env-file .env logs --tail=80 api
exit 1
