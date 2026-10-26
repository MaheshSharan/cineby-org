FROM oven/bun:1-alpine AS base

# 1. Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 2. Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Use .env.production if present, otherwise fallback to .env.production.example to satisfy Next.js build-time collection
RUN if [ -f .env.production ]; then cp .env.production .env.local; \
    elif [ -f .env.production.example ]; then cp .env.production.example .env.local; fi && \
    bunx next build

# 3. Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3487

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Directory for SQLite storage
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3487

CMD ["bun", "run", "server.js"]
