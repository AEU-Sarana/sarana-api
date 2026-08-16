import { Router, type IRouter } from 'express';
import { authenticateToken, requirePermission } from '@src/shared/middleware/auth.middleware';
import { RoleController } from '../../controllers/V1/role.controller';

const router: IRouter = Router();

// All role routes require authentication
router.use(authenticateToken);

// List roles
router.get('/', requirePermission('users.manage', 'read'), RoleController.listRoles);

// Get role details
router.get('/:id', requirePermission('users.manage', 'read'), RoleController.getRole);

// Create custom role
router.post('/', requirePermission('users.manage', 'create'), RoleController.createRole);

// Update custom role
router.put('/:id', requirePermission('users.manage', 'update'), RoleController.updateRole);

// Delete custom role
router.delete('/:id', requirePermission('users.manage', 'delete'), RoleController.deleteRole);

export default router;
