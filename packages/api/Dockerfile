# Dockerfile para AI Hub API (Express)
# Build context esperado: raíz del monorepo.
# Razón: necesita acceso al lockfile del workspace durante el build.

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder

WORKDIR /repo

# Instalar dependencias del sistema necesarias para compilar bcrypt y otros paquetes nativos
RUN apk add --no-cache python3 make g++

# Copiar manifests primero para cachear instalación de dependencias.
# Se conserva el manifest web porque el root declara workspaces packages/*,
# pero la instalación se filtra al workspace del API.
COPY package.json package-lock.json turbo.json ./
COPY packages/api/package.json packages/api/
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/

# Instalar solo lo necesario para construir el API.
RUN npm ci --workspace=@ai-hub/api --include-workspace-root=false

# Copiar código fuente y construir solo la API
COPY packages/api packages/api

RUN npm run build --workspace=@ai-hub/api

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime

WORKDIR /app

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S aihub -u 1001 -G nodejs

# Cliente psql para migraciones y toolchain temporal para dependencias nativas
RUN apk add --no-cache postgresql-client \
  && apk add --no-cache --virtual .build-deps python3 make g++

# Instalar solo dependencias de producción de la API, sin arrastrar otros workspaces
COPY --from=builder /repo/package.json /repo/package-lock.json ./
COPY --from=builder /repo/packages/api/package.json packages/api/
COPY --from=builder /repo/packages/shared/package.json packages/shared/
COPY --from=builder /repo/packages/web/package.json packages/web/
RUN npm ci --omit=dev --workspace=@ai-hub/api --include-workspace-root=false \
  && npm cache clean --force \
  && apk del .build-deps

# Copiar artefactos de build necesarios para producción
COPY --from=builder /repo/packages/api/dist packages/api/dist
COPY --from=builder /repo/packages/api/migrations packages/api/migrations

USER aihub

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

WORKDIR /app/packages/api

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
