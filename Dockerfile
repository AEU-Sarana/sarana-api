# =========================================================
# BASE (shared for dev/build/prod)
# =========================================================
FROM node:20-alpine AS base

# Install timezone + fontconfig (required for sharp SVG text rendering)
RUN apk add --no-cache tzdata fontconfig font-noto-khmer \
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

# Install production dependencies AND prisma CLI
RUN pnpm install --prod --frozen-lockfile && \
    pnpm add -D prisma tsx

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
