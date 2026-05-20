# ==================================
# Stage 1: Dependencies
# ==================================
FROM oven/bun:1-alpine AS dependencies

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile

# ==================================
# Stage 2: Build
# ==================================
FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json /app/bun.lock ./

COPY . .

RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" bunx prisma generate

RUN bun build src/app.ts --outdir=dist --target=bun && \
    bun build src/worker.ts --outdir=dist --target=bun

# ==================================
# Stage 3: Production
# ==================================
FROM oven/bun:1-alpine AS production

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --production --frozen-lockfile

COPY --chown=nodejs:nodejs prisma ./prisma/

COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=build --chown=nodejs:nodejs /app/dist/prisma.config.js ./prisma.config.js

RUN mkdir -p /app/logger /app/uploads && chown -R nodejs:nodejs /app/logger /app/uploads

USER nodejs

EXPOSE 4039

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD bun -e "try { const r = await fetch('http://localhost:4039/health'); process.exit(r.ok ? 0 : 1) } catch { process.exit(1) }"

ENTRYPOINT ["dumb-init", "--"]

CMD ["bun", "run", "start:migrate"]
