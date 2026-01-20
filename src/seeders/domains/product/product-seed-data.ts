import { DataGenerator } from '../utils/data-generator';
import { SeederHelper } from '../utils/seeder-helper';

export interface ProductSeedData {
  productCode: string;
  productName: string;
  qrCode: string;
  price: number;
  category?: string;
  description?: string;
  imagePath?: string;
  lowStockThreshold?: number;
  status: 'active' | 'inactive';
}

const categories = ['Electronics', 'Clothing', 'Food', 'Beverages', 'Office Supplies', 'Home & Garden'];

export const productSeedData: ProductSeedData[] = Array.from({ length: 50 }, (_, index) => {
  const category = SeederHelper.randomElement(categories);
  return {
    productCode: DataGenerator.generateProductCode('PROD', index),
    productName: DataGenerator.generateProductName(category, index),
    qrCode: DataGenerator.generateQRCode('QR', index),
    price: parseFloat((Math.random() * 990 + 10).toFixed(2)), // 10 to 1000
    category,
    description: `Description for ${DataGenerator.generateProductName(category, index)}`,
    lowStockThreshold: Math.floor(Math.random() * 20 + 5), // 5 to 25
    status: Math.random() > 0.1 ? 'active' : 'inactive', // 90% active
  };
});

