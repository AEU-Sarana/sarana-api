import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { SupplierController } from '@src/domains/Supplier/controllers/V1/supplier.controller';
import { SupplierPaymentController } from '@src/domains/Supplier/controllers/supplier-payment.controller';

const router: IRouter = Router();

router.use(authenticateToken);

// Debt & Payment routes
router.get('/debts', requirePermission('purchasing.manage_suppliers', 'read'), SupplierPaymentController.getDebtOverview);
router.post('/payments', requirePermission('purchasing.manage_suppliers', 'update'), SupplierPaymentController.recordPayment);
router.get('/payments', requirePermission('purchasing.manage_suppliers', 'read'), SupplierPaymentController.getPaymentHistory);

// Supplier CRUD routes
router.get('/', requirePermission('purchasing.manage_suppliers', 'read'), SupplierController.listSuppliers);
router.get('/:id', requirePermission('purchasing.manage_suppliers', 'read'), SupplierController.getSupplier);
router.post('/', requirePermission('purchasing.manage_suppliers', 'create'), SupplierController.createSupplier);
router.put('/:id', requirePermission('purchasing.manage_suppliers', 'update'), SupplierController.updateSupplier);
router.delete('/:id', requirePermission('purchasing.manage_suppliers', 'delete'), SupplierController.deleteSupplier);

export default router;
