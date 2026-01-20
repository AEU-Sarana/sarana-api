import { Router, type IRouter } from 'express';
import { apiVersionMiddleware } from '@src/shared/middleware/api-version.middleware';
import { loggingMiddleware } from '@src/shared/middleware/logging.middleware';
import { apiRateLimiter } from '@src/shared/middleware/rate-limit.middleware';
import { errorMiddleware } from '@src/shared/middleware/error.middleware';

// Import version-specific routers
import v1Routes from './v1';
import v2Routes from './v2'; // Future version

const router: IRouter = Router();

// Apply global middleware
router.use(loggingMiddleware);
router.use(apiVersionMiddleware);
router.use(apiRateLimiter);

// Health check endpoint (no version)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Route to version-specific routers
router.use('/v1', v1Routes);
router.use('/v2', v2Routes); // Future version

// Error middleware (must be last)
router.use(errorMiddleware);

export default router;