import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('=== starting simple order endpoint test ===');

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

    // 2. Fetch active products to pick a product
    console.log('\n2. Fetching products to pick a test item...');
    const productsRes = await client.get('/products?limit=10');
    const products = productsRes.data.data.products;

    if (!products || products.length === 0) {
      throw new Error('No products found in the database. Please seed products first.');
    }

    const testProduct = products[0];
    console.log(`Picked test product: "${testProduct.product_name}" (ID: ${testProduct.product_id}) Price: $${testProduct.price}`);

    // Ensure it has some stock or positive stock levels if needed.
    // If stock is 0, the server allows negative stock/overselling with a fallback cost.
    
    // 3. Create simple online order (POST /orders)
    console.log('\n3. Placing a simple online order (POST /orders)...');
    
    const quantity = 2;
    const subtotal = Number((testProduct.price * quantity).toFixed(2));
    const discountAmount = 0.50;
    const taxAmount = 0.00;
    const serviceFee = 0.00;
    const totalAmount = Number((subtotal - discountAmount + taxAmount + serviceFee).toFixed(2));

    const orderPayload = {
      payment_method: 'CASH',
      received_amount: totalAmount + 5.00, // Cash paid with change
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      service_fee: serviceFee,
      items: [
        {
          product_id: testProduct.product_id,
          quantity: quantity,
          unit_price: testProduct.price,
          discount_amount: 0.00,
          subtotal: subtotal
        }
      ]
    };

    const orderRes = await client.post('/orders', orderPayload);
    const createdOrder = orderRes.data.data;

    console.log('\nSuccess! Order created:');
    console.log(`- Order ID: ${createdOrder.order_id}`);
    console.log(`- Receipt Number (Server-generated): ${createdOrder.receipt_number}`);
    console.log(`- Order Date (Server default): ${createdOrder.order_date}`);
    console.log(`- Total Amount: $${createdOrder.total_amount}`);
    console.log(`- Payment Method: ${createdOrder.payment_method}`);
    console.log(`- Has Receipt Link: ${createdOrder.has_receipt_link}`);
    console.log(`- Items Count: ${createdOrder.items?.length}`);
    if (createdOrder.items?.length > 0) {
      console.log(`  - Item 1: ${createdOrder.items[0].product_name} x ${createdOrder.items[0].quantity}`);
    }

    console.log('\n=== SIMPLE ORDER ENDPOINT TEST PASSED SUCCESSFULLY! ===');

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
