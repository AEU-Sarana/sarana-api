import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { SeederHelper } from '../utils/seeder-helper';

export class AuditLogSeeder extends BaseSeeder {
  name = 'Audit Logs';

  async seed(): Promise<void> {
    const users = await prisma.user.findMany({
      select: { userId: true },
    });

    if (users.length === 0) {
      console.log('   ⚠️  No users found. Skipping audit log seeding.');
      return;
    }

    const actions = [
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'CREATE_PRODUCT',
      'UPDATE_PRODUCT',
      'DELETE_PRODUCT',
      'CREATE_ORDER',
      'UPDATE_ORDER',
      'STOCK_IN',
      'STOCK_OUT',
      'ADJUST_STOCK',
    ];

    const entityTypes = ['User', 'Product', 'Order', 'Stock'];
    const ipAddresses = ['192.168.1.1', '192.168.1.2', '10.0.0.1', '127.0.0.1'];
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Mozilla/5.0 (X11; Linux x86_64)',
    ];

    const logs = [];

    // Create audit logs for the last 90 days
    for (let i = 0; i < 200; i++) {
      const userId = SeederHelper.randomElement<{ userId: number }>(users).userId;
      const action = SeederHelper.randomElement(actions);
      const entityType = SeederHelper.randomElement(entityTypes);
      const entityId = SeederHelper.randomInt(1, 100);

      const createdAt = SeederHelper.randomDate(
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        new Date()
      );

      const log = await prisma.auditLog.create({
        data: {
          userId: Math.random() > 0.1 ? userId : null, // 90% have user
          action,
          entityType,
          entityId,
          oldValues: Math.random() > 0.5 ? ({ oldValue: 'previous' } as any) : undefined,
          newValues: { newValue: 'current' } as any,
          ipAddress: SeederHelper.randomElement(ipAddresses),
          userAgent: SeederHelper.randomElement(userAgents),
          createdAt,
        },
      });

      logs.push(log);
    }

    console.log(`   Created ${logs.length} audit logs`);
  }
}

