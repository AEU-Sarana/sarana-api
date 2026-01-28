import { Router, type IRouter } from 'express';
import userRoutes from '@src/domains/User/routes/V1/user.routes';

const router: IRouter = Router();

router.use('/', userRoutes);

export default router;