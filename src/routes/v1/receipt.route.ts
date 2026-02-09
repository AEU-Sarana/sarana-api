import { Router, type IRouter } from 'express';
import ReceiptRoutes from '@src/domains/Receipt/routes/V1';

const router: IRouter = Router();

router.use('/', ReceiptRoutes);

export default router;