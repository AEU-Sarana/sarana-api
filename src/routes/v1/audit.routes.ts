import { Router, type IRouter } from 'express';
import auditRoutes from '@src/domains/Audit/routes/V1/audit.routes';

const router: IRouter = Router();

router.use('/', auditRoutes);

export default router;
