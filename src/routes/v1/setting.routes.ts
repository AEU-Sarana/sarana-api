import { Router, type IRouter } from 'express';
import settingsRoutes from '@src/domains/Setting/routes/V1/settings.routes';

const router: IRouter = Router();

router.use('/', settingsRoutes);

export default router;

