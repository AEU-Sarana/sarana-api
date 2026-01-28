import { Router, type IRouter } from 'express';
import shiftRoutes from '@src/domains/Shift/routes/V1/shift.routes';

const router: IRouter = Router();

router.use('/', shiftRoutes);

export default router;

