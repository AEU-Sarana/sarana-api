import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0', // 0.0.0.0 binds to all network interfaces
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_NAME: process.env.DB_NAME || 'stock_pos',
  DB_PORT: parseInt(process.env.DB_PORT || '5433', 10),
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_TOKEN_EXPIRY || '24h',
  JWT_REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Password
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  
  // Redis
  REDIS_URL: process.env.REDIS_URL,
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6380', 10),
  REDIS_TOKEN_BLACKLIST_TTL: parseInt(process.env.REDIS_TOKEN_BLACKLIST_TTL || '86400', 10),
  
  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  
  // Email (SMTP)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@stockpos.com',
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@stockpos.com',
  
  // Email (Brevo/Sendinblue)
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
  
  // Frontend/App URLs
  FRONTEND_URL: process.env.FRONTEND_URL,
  APP_URL: process.env.APP_URL,
  
  // Storage (S3-compatible: MinIO, R2, Wasabi, AWS S3)
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'minio',
  STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
  STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
  STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'stock-pos-storage',
  STORAGE_REGION: process.env.STORAGE_REGION || 'us-east-1',
  STORAGE_USE_SSL: process.env.STORAGE_USE_SSL === 'true',
  STORAGE_PUBLIC_URL: process.env.STORAGE_PUBLIC_URL,
  
  // MinIO Admin (for docker-compose.yml)
  MINIO_ROOT_USER: process.env.MINIO_ROOT_USER || 'minioadmin',
  MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
  MINIO_API_PORT: parseInt(process.env.MINIO_API_PORT || '9000', 10),
  MINIO_CONSOLE_PORT: parseInt(process.env.MINIO_CONSOLE_PORT || '9001', 10),
  
  // Nginx
  NGINX_HTTP_PORT: parseInt(process.env.NGINX_HTTP_PORT || '8080', 10),
  NGINX_HTTPS_PORT: parseInt(process.env.NGINX_HTTPS_PORT || '8443', 10),
} as const;

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}