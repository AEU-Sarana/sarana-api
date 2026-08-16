import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { SupplierController } from '@src/domains/Supplier/controllers/V1/supplier.controller';

const router: IRouter = Router();

router.use(authenticateToken);

router.get('/', requirePermission('purchasing.manage_suppliers', 'read'), SupplierController.listSuppliers);
router.get('/:id', requirePermission('purchasing.manage_suppliers', 'read'), SupplierController.getSupplier);
router.post('/', requirePermission('purchasing.manage_suppliers', 'create'), SupplierController.createSupplier);
router.put('/:id', requirePermission('purchasing.manage_suppliers', 'update'), SupplierController.updateSupplier);
router.delete('/:id', requirePermission('purchasing.manage_suppliers', 'delete'), SupplierController.deleteSupplier);

export default router;
