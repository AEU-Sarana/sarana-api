import { Router, type IRouter } from 'express';
import categoryRoutes from '@src/domains/Product/routes/V1/category.routes';

const router: IRouter = Router();

router.use('/', categoryRoutes);

export default router;
