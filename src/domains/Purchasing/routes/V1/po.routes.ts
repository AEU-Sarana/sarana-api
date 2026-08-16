import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { POController } from '@src/domains/Purchasing/controllers/V1/po.controller';

const router: IRouter = Router();

router.use(authenticateToken);

router.get('/orders', requirePermission('purchasing.create_po', 'read'), POController.listPOs);
router.get('/orders/:id', requirePermission('purchasing.create_po', 'read'), POController.getPO);
router.get('/orders/:id/pdf', requirePermission('purchasing.create_po', 'read'), POController.downloadPOPDF);
router.post('/orders', requirePermission('purchasing.create_po', 'create'), POController.createPO);
router.patch('/orders/:id/status', requirePermission('purchasing.approve_po', 'update'), POController.updatePOStatus);

router.post('/goods-received', requirePermission('purchasing.receive_stock', 'create'), POController.recordGoodsReceived);

export default router;
