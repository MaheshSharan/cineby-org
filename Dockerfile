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
# Next.js inlines NEXT_PUBLIC_* variables at build time
ENV NEXT_PUBLIC_SITE_URL=https://cineby.group
ENV NEXT_PUBLIC_FLAGS_API_BASE_URL=https://flagsapi.com
ENV NEXT_PUBLIC_TMDB_DEFAULT_LANGUAGE=en
ENV NEXT_PUBLIC_ENABLE_IMAGE_PROXY=true
ENV NEXT_PUBLIC_IMAGE_PROXY_URL=https://wsrv.nl
ENV NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
ENV NEXT_PUBLIC_IMAGE_MODE=wsrv
ENV NEXT_PUBLIC_TRAILER_API_URL=https://trailers.wecollege.net/getOldestTrailer
ENV NEXT_PUBLIC_ENABLE_ANALYTICS=true
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=G-GWQTFJK3QW
ENV NEXT_PUBLIC_GUARD_ENABLED=false
ENV NEXT_PUBLIC_DEVTOOLS_GUARD_ENABLED=false
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=710500048793-55rctnc4coj15s1jvao7l2ouejvpftpn.apps.googleusercontent.com
ENV NEXT_PUBLIC_CONTACT_EMAIL=contact@cineby.group
ENV NEXT_PUBLIC_LEGAL_CONTACT_EMAIL=maheshsharan28@gmail.com

RUN bunx next build

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
