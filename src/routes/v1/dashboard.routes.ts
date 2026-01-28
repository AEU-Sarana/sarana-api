import { Router, type IRouter } from 'express';
import dashboardRoutes from '@src/domains/Dashbord/routes/V1/dashboard.routes';

const router: IRouter = Router();

router.use('/', dashboardRoutes);

export default router;

