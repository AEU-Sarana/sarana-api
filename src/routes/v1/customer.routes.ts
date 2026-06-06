import { Router, type IRouter } from 'express';
import customerRoutes from '@src/domains/Customer/routes/V1/customer.route';

const router: IRouter = Router();

router.use('/', customerRoutes);

export default router;
