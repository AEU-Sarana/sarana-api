import dotenv from 'dotenv';
import type { StringValue } from 'ms';

dotenv.config();


function mustGet(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${name}: ${raw}`);
  return n;
}

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: int('PORT', 3000),
  HOST: process.env.HOST || '0.0.0.0',
  TZ: process.env.TZ || 'Asia/Phnom_Penh',

  // Database (✅ internal defaults for Docker)
  DB_HOST: process.env.DB_HOST || 'db',
  DB_PORT: int('DB_PORT', 5432),
  DB_NAME: process.env.DB_NAME || 'stock_pos',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DATABASE_URL:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'db'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'stock_pos'}`,

  // Redis (✅ internal defaults for Docker)
  REDIS_HOST: process.env.REDIS_HOST || 'redis',
  REDIS_PORT: int('REDIS_PORT', 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  REDIS_URL: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-jwt-secret-stock-pos-2026-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback-jwt-refresh-secret-stock-pos-2026-production',

  // ✅ choose one naming style
  JWT_ACCESS_TOKEN_EXPIRY: (process.env.JWT_ACCESS_TOKEN_EXPIRY || '24h') as StringValue,
  JWT_REFRESH_TOKEN_EXPIRY: (process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d') as StringValue,

  // JWT V2
  JWT_V2_ACCESS_TOKEN_EXPIRY: (process.env.JWT_V2_ACCESS_TOKEN_EXPIRY || '1000m') as StringValue,
  JWT_V2_REFRESH_ABSOLUTE_DAYS: int('JWT_V2_REFRESH_ABSOLUTE_DAYS', 30),
  JWT_V2_REFRESH_IDLE_DAYS: int('JWT_V2_REFRESH_IDLE_DAYS', 7),
  JWT_ISSUER: process.env.JWT_ISSUER || 'stock-pos-api',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'stock-pos-mobile',

  // Encryption
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

  RECEIPT_QR_HMAC_SECRET: process.env.RECEIPT_QR_HMAC_SECRET,

  // Password
  BCRYPT_SALT_ROUNDS: int('BCRYPT_SALT_ROUNDS', 12),

  // Token blacklist TTL
  REDIS_TOKEN_BLACKLIST_TTL: int('REDIS_TOKEN_BLACKLIST_TTL', 86400),

  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: int('SMTP_PORT', 587),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@stockpos.com',
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@stockpos.com',

  // URLs
  FRONTEND_URL: process.env.FRONTEND_URL,
  APP_URL: process.env.APP_URL,
  API_BASE_URL: process.env.API_BASE_URL,

  // Storage
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || (process.env.R2_ENDPOINT ? 'r2' : 'minio'),
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || process.env.R2_ENDPOINT,
  STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID,
  STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || process.env.R2_BUCKET_NAME?.replace(/['"]/g, '') || 'stock-pos-storage',
  STORAGE_REGION: process.env.STORAGE_REGION || (process.env.R2_ENDPOINT ? 'auto' : 'us-east-1'),
  STORAGE_USE_SSL: process.env.STORAGE_USE_SSL === 'true' || !!process.env.R2_ENDPOINT,
  STORAGE_PUBLIC_URL: process.env.STORAGE_PUBLIC_URL,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_URL: process.env.CLOUDINARY_URL,

  // MinIO
  MINIO_ROOT_USER: process.env.MINIO_ROOT_USER || 'minioadmin',
  MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
  MINIO_API_PORT: int('MINIO_API_PORT', 9000),
  MINIO_CONSOLE_PORT: int('MINIO_CONSOLE_PORT', 9001),

  // Nginx
  NGINX_HTTP_PORT: int('NGINX_HTTP_PORT', 8080),
  NGINX_HTTPS_PORT: int('NGINX_HTTPS_PORT', 8443),


} as const;
