# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-alpine

# --- deps stage
FROM node:${NODE_VERSION} AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm fetch

# --- build stage
FROM node:${NODE_VERSION} AS build
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN corepack enable && pnpm install --offline --frozen-lockfile
RUN pnpm prisma generate
RUN pnpm build

# --- runtime stage
FROM node:${NODE_VERSION} AS runtime
RUN apk add --no-cache tini su-exec curl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Install Prisma CLI globally for `prisma migrate deploy` at container start.
# This avoids pnpm's symlinked node_modules layout, which copies awkwardly
# across stages. Pin to the same version as the dev dep.
RUN npm install -g prisma@7.8.0 && npm cache clean --force

# Next standalone bundles @prisma/client, @prisma/adapter-better-sqlite3,
# better-sqlite3, and sharp into .next/standalone/node_modules at build time, so
# runtime app dependencies are already bundled.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/healthcheck.js /app/docker/healthcheck.js
RUN chmod +x /usr/local/bin/entrypoint.sh

# Symlink the globally-installed prisma into /app/node_modules so that
# prisma.config.ts's `import { defineConfig } from 'prisma/config'` resolves
# from /app at container start. The global install carries its own deps
# (@prisma/engines, etc.) under /usr/local/lib/node_modules/prisma/node_modules.
RUN ln -s /usr/local/lib/node_modules/prisma /app/node_modules/prisma

VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node /app/docker/healthcheck.js

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
