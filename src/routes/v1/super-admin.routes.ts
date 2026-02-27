import { Router, type IRouter } from 'express';
import superAdminRoutes from '@src/domains/Super-admin/routes/V1/super-admin.routes';

const router: IRouter = Router();

router.use('/', superAdminRoutes);

export default router;
