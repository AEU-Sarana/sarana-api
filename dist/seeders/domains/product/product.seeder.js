"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
const client_1 = __importDefault(require("../../../database/client"));
const product_seed_data_1 = require("./product-seed-data");
const seeder_helper_1 = require("../utils/seeder-helper");
class ProductSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'Products';
    }
    async seed() {
        const adminUser = await client_1.default.user.findFirst({
            where: { role: 'ADMIN' },
            select: { userId: true },
        });
        if (!adminUser) {
            throw new Error('No admin user found. Please seed users first.');
        }
        // Clear dependent tables to ensure clean pharmacy product & category dataset
        await this.clearTable('stock_movements');
        await this.clearTable('order_items');
        await this.clearTable('orders');
        await this.clearTable('goods_received_items');
        await this.clearTable('goods_received');
        await this.clearTable('purchase_order_items');
        await this.clearTable('purchase_orders');
        await this.clearTable('stock_lots');
        await this.clearTable('stocks');
        await this.clearTable('products');
        await this.clearTable('categories');
        // 1. Seed categories with rich pharmacy descriptions
        const categoryMap = new Map();
        for (const catData of product_seed_data_1.categorySeedData) {
            const cat = await client_1.default.category.upsert({
                where: { name: catData.name },
                update: {
                    description: catData.description,
                },
                create: {
                    name: catData.name,
                    description: catData.description,
                },
                select: { categoryId: true },
            });
            categoryMap.set(catData.name, cat.categoryId);
        }
        // Delete any obsolete categories not in pharmacy seed set
        await client_1.default.category.deleteMany({
            where: {
                name: {
                    notIn: product_seed_data_1.categorySeedData.map((c) => c.name),
                },
            },
        });
        // Default sample fallback images by category
        const defaultCategoryImages = {
            'Pain & Fever Relief': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop',
            'Antibiotics & Anti-Infectives': 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500&auto=format&fit=crop',
            'Cold, Cough & Allergy': 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=500&auto=format&fit=crop',
            'Vitamins & Supplements': 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=500&auto=format&fit=crop',
            'Digestive & GI Health': 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop',
            'Cardiovascular & Diabetes': 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=500&auto=format&fit=crop',
            'First Aid & Medical Supplies': 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=500&auto=format&fit=crop',
            'Topical & Skincare Remedies': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop',
        };
        // 2. Seed products with categoryId links
        for (const productData of product_seed_data_1.productSeedData) {
            const costMultiplier = seeder_helper_1.SeederHelper.randomFloat(0.5, 0.9);
            const avgCost = parseFloat((productData.price * costMultiplier).toFixed(2));
            const categoryId = productData.category ? categoryMap.get(productData.category) : null;
            const imagePath = productData.imagePath || (productData.category ? defaultCategoryImages[productData.category] : null);
            await client_1.default.product.upsert({
                where: {
                    productCode: productData.productCode,
                },
                update: {
                    productName: productData.productName,
                    barcode: productData.barcode,
                    price: productData.price,
                    lastPurchaseCost: avgCost,
                    categoryId,
                    description: productData.description,
                    imagePath,
                    lowStockThreshold: productData.lowStockThreshold,
                    reorderPoint: productData.lowStockThreshold ?? 0,
                    hasExpiry: productData.hasExpiry ?? false,
                    status: productData.status,
                    updatedBy: adminUser.userId,
                },
                create: {
                    productCode: productData.productCode,
                    productName: productData.productName,
                    barcode: productData.barcode,
                    price: productData.price,
                    lastPurchaseCost: avgCost,
                    categoryId,
                    description: productData.description,
                    imagePath,
                    lowStockThreshold: productData.lowStockThreshold,
                    reorderPoint: productData.lowStockThreshold ?? 0,
                    hasExpiry: productData.hasExpiry ?? false,
                    status: productData.status,
                    createdBy: adminUser.userId,
                    updatedBy: adminUser.userId,
                },
            });
        }
        console.log(`   Created/Updated ${product_seed_data_1.productSeedData.length} products`);
    }
}
exports.ProductSeeder = ProductSeeder;
//# sourceMappingURL=product.seeder.js.map