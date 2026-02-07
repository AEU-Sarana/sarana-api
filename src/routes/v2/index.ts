import { Router, type IRouter } from 'express';

// Import route modules
import authRoutes from './auth.routes';

const router: IRouter = Router();

router.use('/auth', authRoutes);

export default router;
