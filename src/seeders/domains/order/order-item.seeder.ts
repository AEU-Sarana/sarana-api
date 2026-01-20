// Order items are created automatically when orders are created
// This seeder is kept for consistency but can be used for additional order items if needed

import { BaseSeeder } from '../../base-seeder';

export class OrderItemSeeder extends BaseSeeder {
  name = 'Order Items';

  async seed(): Promise<void> {
    // Order items are created as part of OrderSeeder
    // This seeder can be used to add additional order items if needed
    console.log('   Order items are created automatically with orders');
  }
}

