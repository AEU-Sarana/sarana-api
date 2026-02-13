import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/database/generated/schema.prisma",
  migrations: {
    path: "src/database/prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@db:5432/stock_pos"
  },
});
