"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataGenerator = void 0;
const seeder_helper_1 = require("./seeder-helper");
class DataGenerator {
    /**
     * Generate a unique product code
     */
    /**
     * Generate a unique product code
     */
    static generateProductCode(prefix = 'MED', index = 0) {
        return `${prefix}-${String(index + 1).padStart(4, '0')}`;
    }
    /**
     * Generate a unique barcode
     */
    static generateBarcode(prefix = 'BC', index = 0) {
        return `${prefix}-${Date.now()}-${index}`;
    }
    /**
     * Generate a unique receipt number
     */
    static generateReceiptNumber(index = 0) {
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
     * Generate a device ID
     */
    static generateDeviceId(prefix = 'DEV') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate random phone number
     */
    static generatePhoneNumber() {
        const prefixes = ['010', '011', '012', '015', '016', '017', '018', '069', '070', '071', '077', '078', '079', '081', '085', '086', '087', '088', '089', '092', '093', '095', '096', '097', '098', '099'];
        const prefix = seeder_helper_1.SeederHelper.randomElement(prefixes);
        const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        return `${prefix}${number}`;
    }
    /**
     * Generate random email
     */
    static generateEmail(username) {
        const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
        const domain = seeder_helper_1.SeederHelper.randomElement(domains);
        return `${username}@${domain}`;
    }
    /**
     * Generate random full name
     */
    static generateFullName() {
        const firstNames = [
            'Sok', 'Chan', 'Srey', 'Dara', 'Ratha', 'Sopheap', 'Sophat', 'Sreyneang',
            'Sreyroth', 'Sreymom', 'Sreypich', 'Sreykeo', 'Sreyleak', 'Sreynich',
            'Sokha', 'Sokheng', 'Sokhom', 'Sokun', 'Sokpheak', 'Sokpisey'
        ];
        const lastNames = [
            'Chan', 'Sok', 'Dara', 'Ratha', 'Sopheap', 'Sophat', 'Srey', 'Kong',
            'Heng', 'Hak', 'Rith', 'Soth', 'Narith', 'Sophea', 'Sopheak'
        ];
        return `${seeder_helper_1.SeederHelper.randomElement(firstNames)} ${seeder_helper_1.SeederHelper.randomElement(lastNames)}`;
    }
    /**
     * Generate random product name
     */
    static generateProductName(category, index) {
        const medForms = ['500mg (100 Tablets)', '400mg (50 Softgels)', '250mg (20 Capsules)', 'Syrup 100ml', 'Gel 20g', 'Oral Drops 15ml'];
        const form = seeder_helper_1.SeederHelper.randomElement(medForms);
        return `Pharma ${category} Formula ${index + 1} ${form}`;
    }
}
exports.DataGenerator = DataGenerator;
//# sourceMappingURL=data-generator.js.map