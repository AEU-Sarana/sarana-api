"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.Role = exports.Permission = void 0;
exports.hasPermission = hasPermission;
exports.getPermissionsForRole = getPermissionsForRole;
var Permission;
(function (Permission) {
    // Auth
    Permission["AUTH_LOGIN"] = "AUTH_LOGIN";
    Permission["AUTH_LOGOUT"] = "AUTH_LOGOUT";
    Permission["AUTH_REFRESH"] = "AUTH_REFRESH";
    Permission["AUTH_RESET_PASSWORD"] = "AUTH_RESET_PASSWORD";
    Permission["AUTH_CHANGE_PASSWORD"] = "AUTH_CHANGE_PASSWORD";
    // Product
    Permission["PRODUCT_CREATE"] = "PRODUCT_CREATE";
    Permission["PRODUCT_UPDATE"] = "PRODUCT_UPDATE";
    Permission["PRODUCT_DELETE"] = "PRODUCT_DELETE";
    Permission["PRODUCT_VIEW"] = "PRODUCT_VIEW";
    // Stock
    Permission["STOCK_VIEW"] = "STOCK_VIEW";
    Permission["STOCK_IN"] = "STOCK_IN";
    Permission["STOCK_ADJUST"] = "STOCK_ADJUST";
    Permission["STOCK_RETURN"] = "STOCK_RETURN";
    Permission["STOCK_HISTORY_VIEW"] = "STOCK_HISTORY_VIEW";
    Permission["STOCK_PULL"] = "STOCK_PULL";
    // Order
    Permission["ORDER_CREATE"] = "ORDER_CREATE";
    Permission["ORDER_VIEW_OWN"] = "ORDER_VIEW_OWN";
    Permission["ORDER_VIEW_ALL"] = "ORDER_VIEW_ALL";
    Permission["ORDER_SYNC"] = "ORDER_SYNC";
    Permission["ORDER_CANCEL_REQUEST"] = "ORDER_CANCEL_REQUEST";
    Permission["ORDER_CANCEL_APPROVE"] = "ORDER_CANCEL_APPROVE";
    // Report
    Permission["REPORT_VIEW_DAILY"] = "REPORT_VIEW_DAILY";
    Permission["REPORT_VIEW_SALES"] = "REPORT_VIEW_SALES";
    Permission["REPORT_VIEW_STOCK"] = "REPORT_VIEW_STOCK";
    Permission["REPORT_EXPORT"] = "REPORT_EXPORT";
    // Backup
    Permission["BACKUP_CREATE"] = "BACKUP_CREATE";
    Permission["BACKUP_LIST"] = "BACKUP_LIST";
    Permission["BACKUP_RESTORE"] = "BACKUP_RESTORE";
    Permission["BACKUP_EXPORT"] = "BACKUP_EXPORT";
    // User
    Permission["USER_CREATE"] = "USER_CREATE";
    Permission["USER_UPDATE"] = "USER_UPDATE";
    Permission["USER_DELETE"] = "USER_DELETE";
    Permission["USER_VIEW"] = "USER_VIEW";
    // Settings
    Permission["SETTINGS_VIEW"] = "SETTINGS_VIEW";
    Permission["SETTINGS_UPDATE"] = "SETTINGS_UPDATE";
    // Dashboard
    Permission["DASHBOARD_VIEW"] = "DASHBOARD_VIEW";
})(Permission || (exports.Permission = Permission = {}));
var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["CASHIER"] = "CASHIER";
})(Role || (exports.Role = Role = {}));
// Role to Permissions Mapping
exports.ROLE_PERMISSIONS = {
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
        Permission.ORDER_CANCEL_REQUEST,
        Permission.ORDER_CANCEL_APPROVE,
        // Report - All
        Permission.REPORT_VIEW_DAILY,
        Permission.REPORT_VIEW_SALES,
        Permission.REPORT_VIEW_STOCK,
        Permission.REPORT_EXPORT,
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
        // Order - Create, view own, sync, cancellation request
        Permission.ORDER_CREATE,
        Permission.ORDER_VIEW_OWN,
        Permission.ORDER_SYNC,
        Permission.ORDER_CANCEL_REQUEST,
        // Dashboard - View
        Permission.DASHBOARD_VIEW,
    ],
};
// Helper function to check if role has permission
function hasPermission(role, permission) {
    return exports.ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
// Helper function to get all permissions for a role
function getPermissionsForRole(role) {
    return exports.ROLE_PERMISSIONS[role] ?? [];
}
//# sourceMappingURL=permissions.js.map