import { BaseSeeder } from '../../base-seeder';
import prisma from '../../../database/client';

export class SupplierSeeder extends BaseSeeder {
  name = 'Suppliers';

  async seed(): Promise<void> {
    await this.clearTable('goods_received_items');
    await this.clearTable('goods_received');
    await this.clearTable('purchase_order_items');
    await this.clearTable('purchase_orders');
    await this.clearTable('suppliers');

    const sampleSuppliers = [
      {
        companyName: 'PharmaCorp Cambodia Co., Ltd.',
        contactPerson: 'Seng Leap',
        phone: '+855 23 881 992',
        email: 'orders@pharmacorp.com.kh',
        address: 'No. 45, St. 271, Phnom Penh, Cambodia',
        taxId: 'K009-902188219',
        paymentTerms: 'NET_30',
        isActive: true,
      },
      {
        companyName: 'Central Pharmacy Wholesale',
        contactPerson: 'Ouk Vibol',
        phone: '+855 12 443 881',
        email: 'vibol@centralpharm.kh',
        address: 'St. 63, BKK1, Phnom Penh, Cambodia',
        taxId: 'K002-118277334',
        paymentTerms: 'NET_15',
        isActive: true,
      },
      {
        companyName: 'MediCare Distribution Ltd.',
        contactPerson: 'Keo Navy',
        phone: '+855 92 112 334',
        email: 'navy.keo@medicare-kh.com',
        address: 'St. 598, Toul Kork, Phnom Penh, Cambodia',
        taxId: 'K005-776200192',
        paymentTerms: 'NET_30',
        isActive: true,
      },
      {
        companyName: 'Sokha Biotech Import-Export',
        contactPerson: 'Tep Sovann',
        phone: '+855 88 554 990',
        email: 'sales@sokhabiotech.com',
        address: 'St. 1984, Sen Sok, Phnom Penh, Cambodia',
        taxId: 'K008-334188200',
        paymentTerms: 'COD',
        isActive: true,
      },
      {
        companyName: 'Global Health Supplies Asia',
        contactPerson: 'Dr. Lim Heng',
        phone: '+855 16 998 776',
        email: 'heng.lim@ghs-asia.com',
        address: 'National Rd 6A, Chroy Changvar, Phnom Penh',
        taxId: 'K001-445199882',
        paymentTerms: 'NET_60',
        isActive: true,
      },
    ];

    for (const data of sampleSuppliers) {
      await prisma.supplier.create({ data });
    }

    console.log(`   Seeded ${sampleSuppliers.length} suppliers`);
  }
}
