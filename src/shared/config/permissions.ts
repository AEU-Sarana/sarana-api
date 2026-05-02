export enum Permission {
  // Auth
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_REFRESH = 'AUTH_REFRESH',
  AUTH_RESET_PASSWORD = 'AUTH_RESET_PASSWORD',
  AUTH_CHANGE_PASSWORD = 'AUTH_CHANGE_PASSWORD',

  // Product
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  PRODUCT_VIEW = 'PRODUCT_VIEW',

  // Stock
  STOCK_VIEW = 'STOCK_VIEW',
  STOCK_IN = 'STOCK_IN',
  STOCK_ADJUST = 'STOCK_ADJUST',
  STOCK_RETURN = 'STOCK_RETURN',
  STOCK_HISTORY_VIEW = 'STOCK_HISTORY_VIEW',
  STOCK_PULL = 'STOCK_PULL',

  // Order
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_VIEW_OWN = 'ORDER_VIEW_OWN',
  ORDER_VIEW_ALL = 'ORDER_VIEW_ALL',
  ORDER_SYNC = 'ORDER_SYNC',

  // Shift
  SHIFT_START = 'SHIFT_START',
  SHIFT_CLOSE = 'SHIFT_CLOSE',
  SHIFT_VIEW_OWN = 'SHIFT_VIEW_OWN',
  SHIFT_VIEW_ALL = 'SHIFT_VIEW_ALL',
  SHIFT_RECONCILE = 'SHIFT_RECONCILE',

  // Report
  REPORT_VIEW_DAILY = 'REPORT_VIEW_DAILY',
  REPORT_VIEW_SALES = 'REPORT_VIEW_SALES',
  REPORT_VIEW_STOCK = 'REPORT_VIEW_STOCK',
  REPORT_EXPORT = 'REPORT_EXPORT',

  // Telegram
  TELEGRAM_CONFIG = 'TELEGRAM_CONFIG',
  TELEGRAM_TEST = 'TELEGRAM_TEST',
  TELEGRAM_SEND = 'TELEGRAM_SEND',
  TELEGRAM_RESEND = 'TELEGRAM_RESEND',

  // Backup
  BACKUP_CREATE = 'BACKUP_CREATE',
  BACKUP_LIST = 'BACKUP_LIST',
  BACKUP_RESTORE = 'BACKUP_RESTORE',
  BACKUP_EXPORT = 'BACKUP_EXPORT',

  // User
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_VIEW = 'USER_VIEW',

  // DeviceBinding
  DEVICE_VIEW = 'DEVICE_VIEW',
  DEVICE_APPROVE = 'DEVICE_APPROVE',
  DEVICE_REVOKE = 'DEVICE_REVOKE',

  // Settings
  SETTINGS_VIEW = 'SETTINGS_VIEW',
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',

  // Dashboard
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',
}

export enum Role {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER',
  RECEIVER = 'RECEIVER',
}

// Role to Permissions Mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Auth - All
    Permission.AUTH_LOGIN,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_REFRESH,
    Permission.AUTH_RESET_PASSWORD,
    Permission.AUTH_CHANGE_PASSWORD,

    // Product - All
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE,
    Permission.PRODUCT_VIEW,

    // Stock - All
    Permission.STOCK_VIEW,
    Permission.STOCK_IN,
    Permission.STOCK_ADJUST,
    Permission.STOCK_RETURN,
    Permission.STOCK_HISTORY_VIEW,
    Permission.STOCK_PULL,

    // Order - All
    Permission.ORDER_CREATE,
    Permission.ORDER_VIEW_OWN,
    Permission.ORDER_VIEW_ALL,
    Permission.ORDER_SYNC,

    // Shift - All
    Permission.SHIFT_START,
    Permission.SHIFT_CLOSE,
    Permission.SHIFT_VIEW_OWN,
    Permission.SHIFT_VIEW_ALL,
    Permission.SHIFT_RECONCILE,

    // Report - All
    Permission.REPORT_VIEW_DAILY,
    Permission.REPORT_VIEW_SALES,
    Permission.REPORT_VIEW_STOCK,
    Permission.REPORT_EXPORT,

    // Telegram - All
    Permission.TELEGRAM_CONFIG,
    Permission.TELEGRAM_TEST,
    Permission.TELEGRAM_SEND,
    Permission.TELEGRAM_RESEND,

    // Backup - All
    Permission.BACKUP_CREATE,
    Permission.BACKUP_LIST,
    Permission.BACKUP_RESTORE,
    Permission.BACKUP_EXPORT,

    // User - All
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_VIEW,

    // DeviceBinding - All
    Permission.DEVICE_VIEW,
    Permission.DEVICE_APPROVE,
    Permission.DEVICE_REVOKE,

    // Settings - All
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_UPDATE,

    // Dashboard - All
    Permission.DASHBOARD_VIEW,
  ],

  [Role.CASHIER]: [
    // Auth - Limited
    Permission.AUTH_LOGIN,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_REFRESH,

    // Product - View only
    Permission.PRODUCT_VIEW,

    // Stock - View and pull only
    Permission.STOCK_VIEW,
    Permission.STOCK_PULL,

    // Order - Create, view own, sync
    Permission.ORDER_CREATE,
    Permission.ORDER_VIEW_OWN,
    Permission.ORDER_SYNC,

    // Shift - Own shifts only
    Permission.SHIFT_START,
    Permission.SHIFT_CLOSE,
    Permission.SHIFT_VIEW_OWN,

    // Dashboard - View
    Permission.DASHBOARD_VIEW,
  ],

  [Role.RECEIVER]: [
    Permission.AUTH_LOGIN,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_REFRESH,
    Permission.PRODUCT_VIEW,
    Permission.STOCK_VIEW,
    Permission.STOCK_IN,
    Permission.STOCK_HISTORY_VIEW,
  ],
};

// Helper function to check if role has permission
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Helper function to get all permissions for a role
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
