import { Router, type IRouter } from 'express';

// Import route modules
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import stockRoutes from './stock.routes';
import inventoryRoutes from './inventory.routes';
import orderRoutes from './order.routes';
import ReceiptRoutes from './receipt.route';
import reportRoutes from './report.routes';
import telegramRoutes from './telegram.routes';
import telegramAdminBotRoutes from './telegram-admin-bot.routes';
import backupRoutes from './backup.routes';
import userRoutes from './user.routes';
import roleRoutes from '@src/domains/User/routes/V1/role.routes';
import settingRoutes from './setting.routes';
import dashboardRoutes from './dashboard.routes';
import customerRoutes from './customer.routes';
import permissionRoutes from '@src/domains/Auth/routes/V1/permission.routes';
import supplierRoutes from '@src/domains/Supplier/routes/V1/supplier.routes';
import purchasingRoutes from '@src/domains/Purchasing/routes/V1/po.routes';

const router: IRouter = Router();

// Mount route modules
router.use('/', permissionRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/stocks', stockRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/receipts', ReceiptRoutes);
router.use('/reports', reportRoutes);
router.use('/telegram', telegramRoutes);
router.use('/telegram-admin-bot', telegramAdminBotRoutes);
router.use('/backup', backupRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/settings', settingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchasing', purchasingRoutes);

export default router;
