# Database Seeders

This directory contains seeders for populating the database with test data for development and testing purposes.

## Structure

```
seeders/
├── base-seeder.ts              # Base seeder class
├── index.ts                    # Main seeder entry point
└── domains/
    ├── auth/
    │   ├── user-seed-data.ts   # User seed data
    │   └── user.seeder.ts      # User seeder
    ├── product/
    │   ├── product-seed-data.ts
    │   └── product.seeder.ts
    ├── stock/
    │   ├── stock.seeder.ts
    │   └── stock-movement.seeder.ts
    ├── order/
    │   ├── order.seeder.ts
    │   └── order-item.seeder.ts
    ├── shift/
    │   └── shift.seeder.ts
    ├── device-binding/
    │   └── device-binding.seeder.ts
    ├── settings/
    │   └── app-settings.seeder.ts
    ├── telegram/
    │   └── telegram-config.seeder.ts
    ├── shared/
    │   └── audit-log.seeder.ts
    └── utils/
        ├── data-generator.ts   # Data generation utilities
        └── seeder-helper.ts    # Seeder helper functions
```

## Usage

### Run All Seeders

```bash
pnpm seed
# or
pnpm seed:all
```

### Seeder Order

Seeders run in the following order (respecting dependencies):

1. **Users** - Base users (admin, sellers)
2. **Products** - Product catalog (50 products)
3. **Stock** - Stock levels for products
4. **Shifts** - Shift records (30 days)
5. **Orders** - Order records with order items
6. **Stock Movements** - Stock movement history
7. **Device Bindings** - Device binding records
8. **App Settings** - Application settings
9. **Telegram Config** - Telegram bot configuration
10. **Audit Logs** - Audit log entries

## Seed Data

### Users
- 1 Admin user (username: `admin`, password: `Admin123!`)
- 3 Seller users (username: `seller1`, `seller2`, `seller3`, password: `Seller123!`)

### Products
- 50 products with random data
- Categories: Electronics, Clothing, Food, Beverages, Office Supplies, Home & Garden
- Prices: $10 - $1000
- Random stock thresholds

### Stock
- Stock records for all products
- Random quantities (0-100)
- Stock versions (1-10)

### Shifts
- 30 shifts (last 30 days)
- Last 7 days marked as ACTIVE
- Random sales data

### Orders
- 5-15 orders per closed shift
- 1-5 items per order
- Random discounts, taxes, service fees

### Stock Movements
- 100 stock movement records
- Types: STOCK_IN, STOCK_OUT, ADJUSTMENT, RETURN
- Last 60 days

### Device Bindings
- Device bindings for 70% of sellers
- Random device names and IDs

### Audit Logs
- 200 audit log entries
- Last 90 days
- Various actions and entity types

## Customization

### Modify Seed Data

Edit the seed data files:
- `domains/auth/user-seed-data.ts` - User data
- `domains/product/product-seed-data.ts` - Product data

### Adjust Quantities

Edit the seeder files to change the number of records:
- `domains/shift/shift.seeder.ts` - Change `30` to desired number of shifts
- `domains/stock/stock-movement.seeder.ts` - Change `100` to desired number
- `domains/shared/audit-log.seeder.ts` - Change `200` to desired number

## Notes

- Seeders use `upsert` to avoid duplicates
- Foreign key relationships are automatically handled
- Some seeders skip if dependencies are missing
- All seeders respect existing data (won't delete unless explicitly coded)

## Development

To add a new seeder:

1. Create a new seeder class extending `BaseSeeder`
2. Implement the `seed()` method
3. Add it to `index.ts` in the correct order
4. Use `SeederHelper` for common operations
5. Use `DataGenerator` for generating test data

