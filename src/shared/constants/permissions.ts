export interface SystemFeature {
  key: string;
  name: string;
  category: 'POS & Checkout' | 'Catalog & Products' | 'Inventory' | 'Sales & Orders' | 'Reports' | 'Customers & Users';
  description: string;
  defaultCashier: boolean;
}

export const SYSTEM_FEATURES: SystemFeature[] = [
  // POS & Checkout
  {
    key: 'pos.checkout',
    name: 'POS Checkout & Sales',
    category: 'POS & Checkout',
    description: 'Process sales transactions and accept payments',
    defaultCashier: true,
  },
  {
    key: 'pos.apply_discount',
    name: 'Apply Custom Discounts',
    category: 'POS & Checkout',
    description: 'Apply custom discounts to cart items or total order',
    defaultCashier: false,
  },
  {
    key: 'pos.edit_price',
    name: 'Override Unit Prices',
    category: 'POS & Checkout',
    description: 'Manually edit product price during checkout',
    defaultCashier: false,
  },
  {
    key: 'pos.hold_cart',
    name: 'Hold & Resume Pending Sales',
    category: 'POS & Checkout',
    description: 'Save active cart items to resume sales later',
    defaultCashier: true,
  },
  {
    key: 'pos.reprint_receipt',
    name: 'Reprint Customer Receipts',
    category: 'POS & Checkout',
    description: 'Reprint receipts for previous sales transactions',
    defaultCashier: true,
  },

  // Catalog & Products
  {
    key: 'catalog.view_products',
    name: 'View Product Catalog',
    category: 'Catalog & Products',
    description: 'Browse products, prices, and stock counts',
    defaultCashier: true,
  },
  {
    key: 'catalog.manage_products',
    name: 'Create & Edit Products',
    category: 'Catalog & Products',
    description: 'Create new products, edit details, and prices',
    defaultCashier: false,
  },
  {
    key: 'catalog.categories',
    name: 'Manage Categories',
    category: 'Catalog & Products',
    description: 'Create, update, and organize product categories',
    defaultCashier: false,
  },

  // Inventory
  {
    key: 'stock.view',
    name: 'View Stock & Expiry Levels',
    category: 'Inventory',
    description: 'Inspect product stock counts and batch expiry dates',
    defaultCashier: true,
  },
  {
    key: 'stock.stock_in',
    name: 'Stock In Shipments',
    category: 'Inventory',
    description: 'Record incoming stock deliveries from suppliers',
    defaultCashier: false,
  },
  {
    key: 'stock.adjustments',
    name: 'Manual Stock Adjustments',
    category: 'Inventory',
    description: 'Perform stock adjustments to correct inventory count',
    defaultCashier: false,
  },

  // Sales & Orders
  {
    key: 'sales.view_history',
    name: 'View Sales History',
    category: 'Sales & Orders',
    description: 'View past completed transaction history',
    defaultCashier: true,
  },
  {
    key: 'sales.refund_order',
    name: 'Issue Order Refunds',
    category: 'Sales & Orders',
    description: 'Process product returns and issue money refunds',
    defaultCashier: false,
  },
  {
    key: 'sales.cancel_order',
    name: 'Cancel Completed Orders',
    category: 'Sales & Orders',
    description: 'Void or cancel an existing order transaction',
    defaultCashier: false,
  },

  // Reports
  {
    key: 'reports.daily_shift',
    name: 'View Own Shift Summary',
    category: 'Reports',
    description: 'View register end-of-shift closing summary',
    defaultCashier: true,
  },
  {
    key: 'reports.full_analytics',
    name: 'View Revenue & Analytics',
    category: 'Reports',
    description: 'View store-wide revenue, profit, and business reports',
    defaultCashier: false,
  },

  // Customers & Users
  {
    key: 'customers.manage',
    name: 'Manage Customer Profiles',
    category: 'Customers & Users',
    description: 'Register and update customer information',
    defaultCashier: true,
  },
  {
    key: 'users.manage',
    name: 'Manage Staff & Roles',
    category: 'Customers & Users',
    description: 'Create and update cashier staff accounts and permissions',
    defaultCashier: false,
  },
];

export const DEFAULT_CASHIER_PERMISSIONS: string[] = SYSTEM_FEATURES
  .filter((f) => f.defaultCashier)
  .map((f) => f.key);
