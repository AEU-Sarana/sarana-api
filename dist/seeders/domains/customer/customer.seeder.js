"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
const client_1 = __importDefault(require("../../../database/client"));
const data_generator_1 = require("../utils/data-generator");
class CustomerSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Customers';
    }
    async seed() {
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
            const phone = data_generator_1.DataGenerator.generatePhoneNumber();
            const username = fullName.toLowerCase().replace(/\s+/g, '.');
            const email = data_generator_1.DataGenerator.generateEmail(username);
            const deviceId = data_generator_1.DataGenerator.generateDeviceId();
            const customer = await client_1.default.customer.create({
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
exports.CustomerSeeder = CustomerSeeder;
//# sourceMappingURL=customer.seeder.js.map