# Backend API Endpoints & Test Summary

**Location:** `stock-pos-server`  
**Prepared:** 2026-02-04  
**Base URL:** `/api/v1`

## Test Summary
- **API testing:** Completed in Postman (per user confirmation).  
- **Notes:** Tests were executed externally; no automated test run is recorded in this repo.

## Endpoint Inventory

### Auth
- `POST /auth/login`
- `POST /auth/reset-password-request`
- `POST /auth/logout`
- `POST /auth/refresh-token`
- `GET /auth/me`
- `POST /auth/change-password`
- `POST /auth/change-pin`
- `POST /auth/reset-password`
- `POST /auth/reset-pin`

### Products
- `GET /products`
- `GET /products/categories`
- `GET /products/:id`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`

### Stocks
- `GET /stocks`
- `GET /stocks/movements`
- `POST /stocks/in`
- `POST /stocks/adjust`
- `POST /stocks/return`
- `GET /stocks/:productId`

### Orders
- `POST /orders/sync`
- `GET /orders/sync-status`
- `GET /orders`
- `GET /orders/:id`

### Shifts
- `POST /shifts/start`
- `GET /shifts`
- `GET /shifts/:id/reconciliation`
- `GET /shifts/:id`
- `POST /shifts/:id/close`

### Reports
- `GET /reports/daily`
- `GET /reports/sales`
- `GET /reports/stock`
- `POST /reports/export`

### Telegram
- `POST /telegram/config`
- `POST /telegram/test`
- `POST /telegram/send-report`
- `POST /telegram/resend-report`
- `POST /telegram/send-test-message`

### Backup
- `POST /backup/create`

### Users
- `GET /users`
- `GET /users/sellers`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`
- `PUT /users/:id/pin`

### Device Bindings
- `GET /device-bindings`
- `GET /device-bindings/:id`
- `POST /device-bindings`
- `PUT /device-bindings/:id/approve`
- `PUT /device-bindings/:id/revoke`
- `DELETE /device-bindings/:id`

### Settings
- `GET /settings`
- `PUT /settings`

### Dashboard
- `GET /dashboard/overview`

### Telegram Admin Bot
- `POST /telegram-admin-bot/webhook`

## Non-Versioned Endpoints
- `GET /api/health` (API health)
- `GET /` (root API info)
- `GET /storage/:bucket/:key` (file access; requires auth)

## Seed Dataset
Seeders exist for users, shifts, orders, products, stock, device bindings, settings, and telegram config in `src/seeders/`.  
Run with `pnpm seed` or `pnpm seed:all`.
