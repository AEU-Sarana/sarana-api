export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'all';

export interface SystemFeature {
  key: string;
  name: string;
  category: 'POS & Checkout' | 'Catalog & Products' | 'Inventory' | 'Sales & Orders' | 'Reports' | 'Customers & Users';
  description: string;
  defaultCashier: boolean;
  supportedActions: PermissionAction[];
}

export interface UserPermissionItem {
  featureKey: string;
  actions: PermissionAction[];
}

export const SYSTEM_FEATURES: SystemFeature[] = [
  // POS & Checkout
  {
    key: 'pos.checkout',
    name: 'POS Checkout & Sales',
    category: 'POS & Checkout',
    description: 'Process sales transactions and accept payments',
    defaultCashier: true,
    supportedActions: ['read', 'create', 'update', 'all'],
  },
  {
    key: 'pos.apply_discount',
    name: 'Apply Custom Discounts',
    category: 'POS & Checkout',
    description: 'Apply custom discounts to cart items or total order',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'all'],
  },
  {
    key: 'pos.edit_price',
    name: 'Override Unit Prices',
    category: 'POS & Checkout',
    description: 'Manually edit product price during checkout',
    defaultCashier: false,
    supportedActions: ['read', 'update', 'all'],
  },
  {
    key: 'pos.hold_cart',
    name: 'Hold & Resume Pending Sales',
    category: 'POS & Checkout',
    description: 'Save active cart items to resume sales later',
    defaultCashier: true,
    supportedActions: ['read', 'create', 'update', 'delete', 'all'],
  },
  {
    key: 'pos.reprint_receipt',
    name: 'Reprint Customer Receipts',
    category: 'POS & Checkout',
    description: 'Reprint receipts for previous sales transactions',
    defaultCashier: true,
    supportedActions: ['read', 'create', 'all'],
  },

  // Catalog & Products
  {
    key: 'catalog.view_products',
    name: 'View Product Catalog',
    category: 'Catalog & Products',
    description: 'Browse products, prices, and stock counts',
    defaultCashier: true,
    supportedActions: ['read', 'all'],
  },
  {
    key: 'catalog.manage_products',
    name: 'Create & Edit Products',
    category: 'Catalog & Products',
    description: 'Create new products, edit details, and prices',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'update', 'delete', 'all'],
  },
  {
    key: 'catalog.categories',
    name: 'Manage Categories',
    category: 'Catalog & Products',
    description: 'Create, update, and organize product categories',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'update', 'delete', 'all'],
  },

  // Inventory
  {
    key: 'stock.view',
    name: 'View Stock & Expiry Levels',
    category: 'Inventory',
    description: 'Inspect product stock counts and batch expiry dates',
    defaultCashier: true,
    supportedActions: ['read', 'all'],
  },
  {
    key: 'stock.stock_in',
    name: 'Stock In Shipments',
    category: 'Inventory',
    description: 'Record incoming stock deliveries from suppliers',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'update', 'all'],
  },
  {
    key: 'stock.adjustments',
    name: 'Manual Stock Adjustments',
    category: 'Inventory',
    description: 'Perform stock adjustments to correct inventory count',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'update', 'all'],
  },

  // Sales & Orders
  {
    key: 'sales.view_history',
    name: 'View Sales History',
    category: 'Sales & Orders',
    description: 'View past completed transaction history',
    defaultCashier: true,
    supportedActions: ['read', 'all'],
  },
  {
    key: 'sales.refund_order',
    name: 'Issue Order Refunds',
    category: 'Sales & Orders',
    description: 'Process product returns and issue money refunds',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'update', 'all'],
  },
  {
    key: 'sales.cancel_order',
    name: 'Cancel Completed Orders',
    category: 'Sales & Orders',
    description: 'Void or cancel an existing order transaction',
    defaultCashier: false,
    supportedActions: ['read', 'update', 'delete', 'all'],
  },

  // Reports
  {
    key: 'reports.daily_shift',
    name: 'View Own Shift Summary',
    category: 'Reports',
    description: 'View register end-of-shift closing summary',
    defaultCashier: true,
    supportedActions: ['read', 'all'],
  },
  {
    key: 'reports.full_analytics',
    name: 'View Revenue & Analytics',
    category: 'Reports',
    description: 'View store-wide revenue, profit, and business reports',
    defaultCashier: false,
    supportedActions: ['read', 'all'],
  },

  // Customers & Users
  {
    key: 'customers.manage',
    name: 'Manage Customer Profiles',
    category: 'Customers & Users',
    description: 'Register and update customer information',
    defaultCashier: true,
    supportedActions: ['read', 'create', 'update', 'delete', 'all'],
  },
  {
    key: 'users.manage',
    name: 'Manage Staff & Roles',
    category: 'Customers & Users',
    description: 'Create and update cashier staff accounts and permissions',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'update', 'delete', 'all'],
  },

  // Purchasing & Suppliers
  {
    key: 'purchasing.manage_suppliers',
    name: 'Manage Suppliers',
    category: 'Inventory',
    description: 'Create, update, and manage supplier profiles',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'update', 'delete', 'all'],
  },
  {
    key: 'purchasing.create_po',
    name: 'Create & Edit Purchase Orders',
    category: 'Inventory',
    description: 'Draft and build purchase orders to send to suppliers',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'update', 'all'],
  },
  {
    key: 'purchasing.approve_po',
    name: 'Approve & Cancel Purchase Orders',
    category: 'Inventory',
    description: 'Approve draft purchase orders or void order requests',
    defaultCashier: false,
    supportedActions: ['read', 'update', 'all'],
  },
  {
    key: 'purchasing.receive_stock',
    name: 'Receive Goods & Stock In',
    category: 'Inventory',
    description: 'Process incoming goods received against purchase orders',
    defaultCashier: false,
    supportedActions: ['read', 'create', 'all'],
  },
];

export const DEFAULT_CASHIER_PERMISSIONS: UserPermissionItem[] = SYSTEM_FEATURES
  .filter((f) => f.defaultCashier)
  .map((f) => ({
    featureKey: f.key,
    actions: ['read', 'create', 'update'],
  }));
