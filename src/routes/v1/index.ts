import { Router, type IRouter } from 'express';

// Import domain routes
import authRoutes from '@src/domains/Auth/routes/V1/auth.routes';
import productRoutes from '@src/domains/Product/routes/V1/product.routes';
import stockRoutes from '@src/domains/Stock/routes/V1/stock.route';
import orderRoutes from '@src/domains/Order/routes/V1/order.routes';
import shiftRoutes from '@src/domains/Shift/routes/V1/shift.routes';
import reportRoutes from '@src/domains/Report/routes/V1/report.routes';
import telegramRoutes from '@src/domains/Telegram/routes/V1/telegram.routes';
import backupRoutes from '@src/domains/Backup/routes/V1/backup.routes';
import userRoutes from '@src/domains/User/routes/V1/user.routes';
import deviceBindingRoutes from '@src/domains/DeviceBinding/routes/V1/device-binding.routes';
import settingsRoutes from '@src/domains/Setting/routes/V1/settings.routes';
import dashboardRoutes from '@src/domains/Dashbord/routes/V1/dashboard.routes';

const router: IRouter = Router();

// Mount domain routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/stocks', stockRoutes);
router.use('/orders', orderRoutes);
router.use('/shifts', shiftRoutes);
router.use('/reports', reportRoutes);
router.use('/telegram', telegramRoutes);
router.use('/backup', backupRoutes);
router.use('/users', userRoutes);
router.use('/device-bindings', deviceBindingRoutes);
router.use('/settings', settingsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;