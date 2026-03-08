# ==================================
# Stage 1: Dependencies
# ==================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm ci

# ==================================
# Stage 2: Build
# ==================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copy source code
COPY . .

# Generate Prisma Client (DATABASE_URL is required by prisma.config.ts but not used during generate)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Build TypeScript
RUN npm run build

# ==================================
# Stage 3: Production
# ==================================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy Prisma schema for migrations
COPY --chown=nodejs:nodejs prisma ./prisma/

# Copy built application from build stage
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled prisma config so migrate deploy can load it
COPY --from=build --chown=nodejs:nodejs /app/dist/prisma.config.js ./prisma.config.js

# Create writable directories for non-root user
RUN mkdir -p /app/logger /app/uploads && chown -R nodejs:nodejs /app/logger /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4039

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4039/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application with migrations
CMD ["npm", "run", "start:migrate"]
