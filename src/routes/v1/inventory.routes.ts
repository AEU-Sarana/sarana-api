import { Router, type IRouter } from 'express';
import inventoryRoutes from '@src/domains/Stock/routes/V1/inventory.route';

const router: IRouter = Router();

router.use('/', inventoryRoutes);

export default router;
