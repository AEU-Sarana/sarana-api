# Use Node.js LTS version
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm@10.15.1

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Development stage
FROM base AS development
# Configure pnpm to use store inside container and hoisted node-linker
RUN pnpm config set store-dir /app/.pnpm-store
RUN pnpm config set node-linker hoisted
RUN pnpm install
COPY . .
RUN pnpm db:generate
EXPOSE 3000
CMD ["pnpm", "dev"]

# Build stage
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN npm install -g pnpm@10.15.1

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built files
COPY --from=build /app/dist ./dist

# Copy prisma schema for runtime
COPY --from=build /app/src/database/prisma ./src/database/prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]