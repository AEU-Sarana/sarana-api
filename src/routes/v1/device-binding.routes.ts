import { Router, type IRouter } from 'express';
import deviceBindingRoutes from '@src/domains/DeviceBinding/routes/V1/device-binding.routes';

const router: IRouter = Router();

router.use('/', deviceBindingRoutes);

export default router;

