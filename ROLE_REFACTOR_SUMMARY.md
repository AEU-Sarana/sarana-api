# Role Refactor Summary - mini-pos-api

## Overview
Completed comprehensive refactoring to remove `SUPER_ADMIN` feature, rename `SELLER` to `CASHIER`, and add new `RECEIVER` role.

## Changes Made

### 1. Role Model Update
- **File**: `src/shared/config/permissions.ts`
- Removed `SUPER_ADMIN` from `Role` enum
- Updated roles to: `ADMIN`, `CASHIER`, `RECEIVER`
- Added corresponding permissions for `RECEIVER` role
- Updated permission mappings accordingly

### 2. Authentication & Auth Types
- **Files Modified**:
  - `src/domains/Auth/enums/V1/user-role.enum.ts`: Removed SUPER_ADMIN, renamed SELLER → CASHIER, added RECEIVER
  - `src/domains/Auth/types/V2/auth.types.ts`: Updated token payload and response types
  - `src/domains/Auth/services/V2/auth.service.ts`: Updated role handling in access token generation and password reset logic

### 3. User Management
- **Files Modified**:
  - `src/domains/User/enums/user-role.enum.ts`: Updated role enum to ADMIN, CASHIER, RECEIVER
  - `src/domains/User/validators/V1/`: Renamed `list-sellers.validator.ts` → `list-cashiers.validator.ts`
  - `src/domains/User/validators/V1/index.ts`: Updated exports
  - `src/domains/User/controllers/V1/user.controller.ts`: Renamed `listSellers()` → `listCashiers()`
  - `src/domains/User/routes/V1/user.routes.ts`: Updated route from `/sellers` → `/cashiers`
  - `src/domains/User/services/user.service.ts`: Renamed `listSellers()` → `listCashiers()`

### 4. Middleware & Authorization
- **File**: `src/shared/middleware/authorization.middleware.ts`
  - Added `requireAdmin()` export
  - Kept `requireAdminOrCashier()` with backward-compatible alias `requireAdminOrSeller`
  - Removed `requireSuperAdmin()` function

### 5. Domain Services
- **Order Service** (`src/domains/Order/services/order.service.ts`):
  - Updated SELLER role checks → CASHIER
  - Removed legacy SUPER_ADMIN from admin roles set

- **Shift Service** (`src/domains/Shift/services/shift.service.ts`):
  - Updated role checks to use CASHIER instead of SELLER
  - Added explicit unauthorized handling for non-admin roles

- **Report Service & Routes** (`src/domains/Report/`):
  - Updated imports to use `requireAdminOrCashier` instead of `requireAdminOrSeller`
  - Maintained seller_id field naming for backward compatibility in API responses

- **Dashboard Service** (`src/domains/Dashbord/services/dashboard.service.ts`):
  - Updated to use CASHIER role
  - Maintained seller-related naming in output

### 6. Seeders & Database
- **Files Modified**:
  - `src/seeders/domains/auth/user-seed-data.ts`: Removed super-admin seed entry, added RECEIVER user
  - `src/seeders/domains/shift/shift.seeder.ts`: Updated role query from SELLER → CASHIER
  - `src/seeders/domains/device-binding/device-binding.seeder.ts`: Updated role query from SELLER → CASHIER
  - `src/seeders/domains/utils/seeder-helper.ts`: Updated to find CASHIER users instead of SELLER

- **Database Migration** (`src/database/prisma/migrations/domains/auth/20260118000001_create_users_table/migration.sql`):
  - Updated role CHECK constraint to allow: ADMIN, CASHIER, RECEIVER (removed SUPER_ADMIN)

### 7. Routing
- **Files Modified**:
  - Removed entire `src/domains/Super-admin/` directory
  - Removed `src/routes/v1/super-admin.routes.ts`
  - Updated `src/routes/v1/index.ts` to remove super-admin route mounting

## Migration Notes

### Database
If migrating from an existing database with SUPER_ADMIN users:
1. Run the updated migration that changes the role CHECK constraint
2. Manually update existing SELLER entries to CASHIER if needed
3. Delete or reassign SUPER_ADMIN users to appropriate roles

### API Compatibility
- `/api/v1/users/cashiers` endpoint replaces `/api/v1/users/sellers` (if it existed)
- Internal API responses still use `seller_id` / `seller_name` fields for backward compatibility
- All role checks now use CASHIER instead of SELLER

### Testing Recommendations
1. Verify admin/cashier/receiver authorization across all protected routes
2. Test shift management with CASHIER role
3. Verify report access for both ADMIN and CASHIER roles
4. Confirm seed data creates users with correct roles
5. Test device binding for CASHIER users

## Compilation Status
✅ TypeScript compilation: **PASS** (no errors)
✅ All imports resolved correctly
✅ All role enums updated consistently
✅ Authorization middleware properly exported

## Files Removed
- `/src/domains/Super-admin/` (entire directory)
- `/src/routes/v1/super-admin.routes.ts`
- `/src/domains/User/validators/V1/list-sellers.validator.ts` (renamed to list-cashiers.validator.ts)
