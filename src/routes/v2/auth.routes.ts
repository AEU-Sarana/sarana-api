import { Router, type IRouter } from 'express';
import authRoutes from '@src/domains/Auth/routes/V2/auth.routes';

const router: IRouter = Router();

router.use('/', authRoutes);

export default router;