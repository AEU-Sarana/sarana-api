import { ProductService } from '../src/domains/Product/services/product.service';
import { ProductStatus } from '../src/domains/Product/enums/product-status.enum';
import { logger } from '../src/shared/utils/logger';

async function test() {
    console.log('Testing automatic product code generation...');

    const mockRequest = {
        product_name: 'កន្សែង កញ្ចាស់ ថ្មី',
        barcode: `TEST-BARCODE-${Date.now()}`,
        price: 1.5,
        status: ProductStatus.ACTIVE
    };

    try {
        // Mocking an admin user ID
        const adminUserId = 1;

        console.log('Creating product without code...');
        const product = await ProductService.createProduct(mockRequest as any, adminUserId);

        console.log('Success! Product created:');
        console.log(`- Name: ${product.product_name}`);
        console.log(`- Generated Code: ${product.product_code}`);

        if (product.product_code.startsWith('កន្សែង-កញ្ចាស់-ថ្មី-')) {
            console.log('Verification Passed: Code format is correct (slug-sequential).');
        } else {
            console.log('Verification Failed: Code format is incorrect.');
        }

        // Cleanup: delete the test product
        console.log('Cleaning up test product...');
        await ProductService.deleteProduct(product.product_id, adminUserId);
        console.log('Cleanup done.');

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

test();
