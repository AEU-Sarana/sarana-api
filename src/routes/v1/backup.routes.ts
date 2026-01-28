import { Router, type IRouter } from 'express';
import backupRoutes from '@src/domains/Backup/routes/V1/backup.routes';

const router: IRouter = Router();

router.use('/', backupRoutes);

export default router;