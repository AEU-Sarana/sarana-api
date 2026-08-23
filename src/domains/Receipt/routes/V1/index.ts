// src/domains/Receipt/routes/V1/index.ts
import { Router, type IRouter } from 'express';

import receiptRoutes from './receipt.routes';

const router: IRouter = Router();

router.use(receiptRoutes);

export default router;
