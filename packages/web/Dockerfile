# syntax=docker/dockerfile:1

# Web de AI Hub: build de Next.js y servidor standalone de Node.
# Build context: raíz del monorepo (necesita el lockfile y el workspace compartido).
# El token de GitHub Packages llega como secreto de BuildKit: nunca como ENV ni ARG.

FROM node:22-alpine AS deps
WORKDIR /app

# Manifests de todos los workspaces: el lockfile los referencia y npm los exige.
COPY package.json package-lock.json .npmrc turbo.json ./
COPY packages/web/package.json packages/web/
COPY packages/api/package.json packages/api/
COPY packages/shared/package.json packages/shared/
COPY packages/mcp/package.json packages/mcp/

# Solo las dependencias de la web. El token se usa para instalar el design system.
RUN --mount=type=secret,id=npm_token \
  NODE_AUTH_TOKEN="$(cat /run/secrets/npm_token)" \
  npm ci --workspace=@ai-hub/web --include-workspace-root=false


FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json turbo.json ./
COPY packages/web packages/web
COPY packages/shared packages/shared

# `NEXT_PUBLIC_*` se inlinea en el bundle: entra como build-arg, no en app.env.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --workspace=@ai-hub/web


FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# El standalone conserva la estructura del monorepo: server.js queda en
# packages/web/server.js y node_modules en /app/node_modules.
COPY --from=build --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/packages/web/public ./packages/web/public

USER nextjs
EXPOSE 3000

# 127.0.0.1, nunca localhost: BusyBox resuelve localhost a ::1 y el proceso
# escucha solo en IPv4.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "packages/web/server.js"]
