import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';
import { DataGenerator } from '../utils/data-generator';

export class CustomerSeeder extends BaseSeeder {
  name = 'Customers';

  async seed(): Promise<void> {
    // Clear existing customers
    await this.clearTable('customers');
    await this.clearTable('receipt_deliveries');

    const firstNames = [
      'Sok', 'Chan', 'Srey', 'Dara', 'Ratha', 'Sopheap', 'Sophat', 'Sreyneang',
      'Sreyroth', 'Sreymom', 'Sreypich', 'Sreykeo', 'Sreyleak', 'Sreynich'
    ];
    const lastNames = [
      'Chan', 'Sok', 'Dara', 'Ratha', 'Sopheap', 'Sophat', 'Srey', 'Kong',
      'Heng', 'Hak', 'Rith', 'Soth'
    ];

    const customers = [];

    // Create 15 customers
    for (let i = 0; i < 15; i++) {
      const fullName = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
      const phone = DataGenerator.generatePhoneNumber();
      const username = fullName.toLowerCase().replace(/\s+/g, '.');
      const email = DataGenerator.generateEmail(username);
      const deviceId = DataGenerator.generateDeviceId();

      const customer = await prisma.customer.create({
        data: {
          fullName,
          phone: i % 4 === 0 ? null : phone,
          email: i % 3 === 0 ? null : email,
          deviceId,
        },
      });
      customers.push(customer);
    }

    console.log(`   Created/Updated ${customers.length} customers`);
  }
}
