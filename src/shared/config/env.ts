import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0', // 0.0.0.0 binds to all network interfaces
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_TOKEN_EXPIRY: process.env.JWT_ACCESS_TOKEN_EXPIRY || '24h',
  JWT_REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  
  // Password
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  
  // Redis (optional)
  REDIS_URL: process.env.REDIS_URL,
  REDIS_TOKEN_BLACKLIST_TTL: parseInt(process.env.REDIS_TOKEN_BLACKLIST_TTL || '86400', 10),
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@stockpos.com',
} as const;

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}