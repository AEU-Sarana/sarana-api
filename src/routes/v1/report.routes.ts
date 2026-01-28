import { Router, type IRouter } from 'express';
import reportRoutes from '@src/domains/Report/routes/V1/report.routes';

const router: IRouter = Router();

router.use('/', reportRoutes);

export default router;

