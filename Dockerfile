# =========================================================
# BASE (shared for dev/build/prod)
# =========================================================
FROM node:20-alpine AS base

# Install runtime dependencies for node-canvas and fonts
RUN apk add --no-cache \
    tzdata \
    fontconfig \
    cairo \
    pango \
    harfbuzz \
    pixman \
    freetype \
    font-noto-khmer \
    ttf-dejavu \
    libjpeg-turbo \
    giflib \
    postgresql-client \
    && cp /usr/share/zoneinfo/Asia/Phnom_Penh /etc/localtime \
    && echo "Asia/Phnom_Penh" > /etc/timezone

ENV TZ=Asia/Phnom_Penh

# Install pnpm globally
RUN npm install -g pnpm@10.15.1

WORKDIR /app

# ---- INSTALL KHMER FONTS ----
# Copy Khmer fonts from project root (must exist: ./fonts)
COPY fonts/ /usr/share/fonts/truetype/custom/
RUN fc-cache -f -v 2>&1 | head -20 || true
# Verify fonts are installed
RUN fc-list | grep -i "Noto Sans Khmer" || fc-list | grep -i "Khmer" || echo "Warning: Khmer fonts not found in fontconfig"
# ----------------------------

# Copy package files
COPY package.json pnpm-lock.yaml ./

# =========================================================
# DEVELOPMENT
# =========================================================
FROM base AS development

# Install build dependencies for node-canvas
RUN apk add --no-cache \
    build-base \
    python3 \
    pkgconf \
    cairo-dev \
    pango-dev \
    pixman-dev \
    harfbuzz-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    giflib-dev

RUN pnpm config set store-dir /app/.pnpm-store
RUN pnpm config set node-linker hoisted

RUN pnpm install
COPY . .
RUN pnpm db:generate

EXPOSE 3000
CMD ["pnpm", "dev"]

# =========================================================
# BUILD
# =========================================================
FROM base AS build

# Install build dependencies for node-canvas
RUN apk add --no-cache \
    build-base \
    python3 \
    pkgconf \
    cairo-dev \
    pango-dev \
    pixman-dev \
    harfbuzz-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    giflib-dev

RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate
RUN pnpm build

# Prisma client is at src/database/generated; copy into dist so runtime resolves
RUN cp -r src/database/generated dist/database/

# =========================================================
# PRODUCTION (inherits Khmer fonts from base ✅)
# =========================================================
FROM base AS production

WORKDIR /app

# Copy Prisma config (required for schema location)
COPY --from=build /app/prisma.config.ts ./

# Install build dependencies required by native modules (canvas on musl)
RUN apk add --no-cache \
    build-base \
    python3 \
    pkgconf \
    cairo-dev \
    pango-dev \
    pixman-dev \
    harfbuzz-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    giflib-dev

# Install production dependencies (frozen-lockfile to avoid mutations)
RUN pnpm install --prod --frozen-lockfile

# Copy Prisma schema and migrations (needed for migrations)
COPY --from=build /app/src/database/prisma ./src/database/prisma

# Copy migration scripts (.mjs)
COPY --from=build /app/apply-domain-migrations.mjs ./
COPY --from=build /app/check-migrations.mjs ./
COPY --from=build /app/rollback-domain-migrations.mjs ./
COPY --from=build /app/db-generate.mjs ./

# Copy built application
COPY --from=build /app/dist ./dist

# Regenerate Prisma Client in production
RUN pnpm db:generate

# Copy generated Prisma client to dist for module resolution
RUN mkdir -p dist/database/generated && \
    cp -r src/database/generated/* dist/database/generated/

EXPOSE 3000
CMD ["pnpm", "start"]
