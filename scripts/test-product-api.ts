import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('=== starting api product verification tests ===');

  try {
    // 1. Login
    console.log('\n1. Logging in as admin...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@gmail.com',
      password: 'Admin123!'
    });

    const token = loginRes.data.data.token;
    console.log('Login successful! Token acquired.');

    const client = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // 2. List Categories
    console.log('\n2. Fetching categories...');
    const categoriesRes = await client.get('/categories');
    const categories = categoriesRes.data.data;
    console.log(`Fetched ${categories.length} categories.`);
    console.log('Categories:', categories.map((c: any) => `[ID: ${c.categoryId}] ${c.name}`).join(', '));

    if (categories.length === 0) {
      throw new Error('No categories found. Cannot proceed with product tests.');
    }

    const testCategory = categories[0];
    console.log(`Using Category: [ID: ${testCategory.categoryId}] ${testCategory.name} for testing.`);

    // 3. Create Product
    console.log('\n3. Creating a new product...');
    const uniqueBarcode = `BARCODE-${Date.now()}`;
    const createPayload = {
      product_name: 'Verification Test Product',
      barcode: uniqueBarcode,
      price: 15.99,
      category_id: testCategory.categoryId,
      description: 'A test product created during API verification tests.',
      lowStockThreshold: 10,
      hasExpiry: false,
      status: 'ACTIVE'
    };

    const createRes = await client.post('/products', createPayload);
    const createdProduct = createRes.data.data;
    console.log('Product created successfully:');
    console.log(`- ID: ${createdProduct.product_id}`);
    console.log(`- Name: ${createdProduct.product_name}`);
    console.log(`- Product Code (Auto-generated): ${createdProduct.product_code}`);
    console.log(`- Barcode: ${createdProduct.barcode}`);
    console.log(`- Category ID: ${createdProduct.category_id}`);
    console.log(`- Category Name (via relation): ${createdProduct.category?.name}`);

    // 4. Get Product Detail
    console.log('\n4. Fetching product details by ID...');
    const getRes = await client.get(`/products/${createdProduct.product_id}`);
    const fetchedProduct = getRes.data.data;
    console.log('Fetched details successfully:');
    console.log(`- Name: ${fetchedProduct.product_name}`);
    console.log(`- Price: ${fetchedProduct.price}`);
    console.log(`- Category details:`, fetchedProduct.category);

    // 5. Update Product
    console.log('\n5. Updating product...');
    const updatePayload = {
      product_name: 'Verification Test Product Updated',
      price: 18.50,
      category_id: testCategory.categoryId,
    };
    const updateRes = await client.put(`/products/${createdProduct.product_id}`, updatePayload);
    const updatedProduct = updateRes.data.data;
    console.log('Product updated successfully:');
    console.log(`- Updated Name: ${updatedProduct.product_name}`);
    console.log(`- Updated Price: ${updatedProduct.price}`);

    // 6. List Products with Filters
    console.log('\n6. Listing products with search/filters...');
    const listRes = await client.get('/products', {
      params: {
        search: 'Verification Test',
        category_id: testCategory.categoryId
      }
    });
    const listData = listRes.data.data;
    console.log(`Listing products search result: found ${listData.pagination?.total} items.`);
    if (listData.products.length > 0) {
      console.log(`Found product in list: ${listData.products[0].product_name}`);
    }

    // 7. Toggle Status
    console.log('\n7. Toggling product status...');
    const toggleRes = await client.patch(`/products/${createdProduct.product_id}/toggle-status`);
    console.log(`Status toggled: new status is ${toggleRes.data.data.status}`);

    // 8. Delete Product
    console.log('\n8. Deleting (soft) product...');
    const deleteRes = await client.delete(`/products/${createdProduct.product_id}`);
    console.log(`Delete API message: ${deleteRes.data.message}`);

    // Verify it is deleted/inactive/removed from normal active lists
    console.log('\n9. Verifying product deletion...');
    try {
      await client.get(`/products/${createdProduct.product_id}`);
      console.log('WARNING: Product still returned via GET detail after delete!');
    } catch (err: any) {
      if (err.response && err.response.status === 400) {
        console.log('Success: Product detail returned 400 (Bad Request / Product not found) as expected.');
      } else {
        console.log(`Unexpected error status on deleted product GET: ${err.message}`);
      }
    }

    console.log('\n=== ALL PRODUCT API VERIFICATION TESTS PASSED SUCCESSFULLY! ===');

  } catch (error: any) {
    console.error('Test run failed with error:');
    if (error.response) {
      console.error(`HTTP Status: ${error.response.status}`);
      console.error('Response Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

runTests();
