import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '@src/shared/config/env';
import apiRoutes from '@src/routes/api';
import storageRoutes from '@src/routes/storage.routes';
import { errorMiddleware } from '@src/shared/middleware/error.middleware';
import { registerStockEventListeners } from '@src/domains/Stock/events/stock.listeners';

// Register event listeners
registerStockEventListeners();

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Storage routes (for serving files) - must be before API routes
app.use('/', storageRoutes);

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Stock POS System API',
    version: '1.0.0',
    docs: '/api/docs',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.path,
  });
});

// Error middleware (must be last)
app.use(errorMiddleware);

export default app;