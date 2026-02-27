import { ProductService } from './src/domains/Product/services/product.service';

async function main() {
    try {
        const result = await ProductService.createProduct(
            {
                product_name: "Test Product",
                barcode: `TEST-${Date.now()}`,
                price: 100,
                category: "Test Category",
                description: "Test Description",
            },
            1 // currentUserId
        );
        console.log("Create Product Result:", result);
    } catch (error) {
        console.error("Error creating product:", error);
    }
}

main();
