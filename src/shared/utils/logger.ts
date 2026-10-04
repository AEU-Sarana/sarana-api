import * as winston from 'winston';
import { env } from '@src/shared/config/env';

const logLevel = env.NODE_ENV === 'production' ? 'info' : 'debug';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

if (!process.env.VERCEL) {
  try {
    transports.push(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
    transports.push(new winston.transports.File({ filename: 'logs/combined.log' }));
  } catch (err) {
    // Ignore file logger errors if read-only
  }
}

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'stock-pos-backend' },
  transports,
});

export default logger;