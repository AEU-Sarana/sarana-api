import { Router, type IRouter } from 'express';
import orderRoutes from '@src/domains/Order/routes/V1/order.routes';

const router: IRouter = Router();

router.use('/', orderRoutes);

export default router;