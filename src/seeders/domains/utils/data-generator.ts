import { SeederHelper } from './seeder-helper';

export class DataGenerator {
  /**
   * Generate a unique product code
   */
  static generateProductCode(prefix: string = 'PROD', index: number = 0): string {
    return `${prefix}-${String(index + 1).padStart(4, '0')}`;
  }

  /**
   * Generate a unique barcode
   */
  static generateBarcode(prefix: string = 'BC', index: number = 0): string {
    return `${prefix}-${Date.now()}-${index}`;
  }

  /**
   * Generate a unique receipt number
   */
  static generateReceiptNumber(index: number = 0): string {
    // Must be globally unique (there is a unique constraint on `receipt_number`).
    // The previous implementation used only YYYYMMDD + incremental index, which
    // collides when re-running seed on the same day.
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase(); // 4 chars
    return `RCP-${dateStr}-${timeStr}-${String(index + 1).padStart(4, '0')}-${rand}`;
  }

  /**
   * Generate a unique order UUID (UUID v4 format)
   */
  static generateOrderUUID(): string {
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate a device ID
   */
  static generateDeviceId(prefix: string = 'DEV'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate random phone number
   */
  static generatePhoneNumber(): string {
    const prefixes = ['010', '011', '012', '015', '016', '017', '018', '069', '070', '071', '077', '078', '079', '081', '085', '086', '087', '088', '089', '092', '093', '095', '096', '097', '098', '099'];
    const prefix = SeederHelper.randomElement(prefixes);
    const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return `${prefix}${number}`;
  }

  /**
   * Generate random email
   */
  static generateEmail(username: string): string {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
    const domain = SeederHelper.randomElement(domains);
    return `${username}@${domain}`;
  }

  /**
   * Generate random full name
   */
  static generateFullName(): string {
    const firstNames = [
      'Sok', 'Chan', 'Srey', 'Dara', 'Ratha', 'Sopheap', 'Sophat', 'Sreyneang',
      'Sreyroth', 'Sreymom', 'Sreypich', 'Sreykeo', 'Sreyleak', 'Sreynich',
      'Sokha', 'Sokheng', 'Sokhom', 'Sokun', 'Sokpheak', 'Sokpisey'
    ];
    const lastNames = [
      'Chan', 'Sok', 'Dara', 'Ratha', 'Sopheap', 'Sophat', 'Srey', 'Kong',
      'Heng', 'Hak', 'Rith', 'Soth', 'Narith', 'Sophea', 'Sopheak'
    ];
    return `${SeederHelper.randomElement(firstNames)} ${SeederHelper.randomElement(lastNames)}`;
  }

  /**
   * Generate random product name
   */
  static generateProductName(category: string, index: number): string {
    const adjectives = ['Premium', 'Deluxe', 'Standard', 'Classic', 'Modern', 'Elegant', 'Luxury'];
    const nouns = ['Item', 'Product', 'Goods', 'Merchandise', 'Article'];
    const adj = SeederHelper.randomElement(adjectives);
    const noun = SeederHelper.randomElement(nouns);
    return `${adj} ${category} ${noun} ${index + 1}`;
  }
}
