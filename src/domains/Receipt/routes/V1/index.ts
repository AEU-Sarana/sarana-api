// src/domains/Receipt/routes/V1/index.ts
import { Router, type IRouter } from 'express';

import receiptRoutes from './receipt.routes';
import telegramReceiptRoutes from './telegram-receipt.routes';

const router: IRouter = Router();


router.use(receiptRoutes);
router.use(telegramReceiptRoutes);

export default router;
