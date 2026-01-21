# AI Coding Guidelines: Stock POS Server

## Architecture Overview

**Stock POS System** is a Node.js/Express backend for a point-of-sale inventory management system. It uses domain-driven design with clear separation of concerns.

### Key Structural Patterns

- **Domain-Driven Design**: Organized under `src/domains/` with independent business domains (Auth, Order, Product, Stock, Shift, User, DeviceBinding, Telegram, etc.)
- **Version-Based Routing**: API routes split into `V1/` and `V2/` subdirectories under each domain for backward compatibility
- **Exception Hierarchy**: Three custom exceptions in `src/shared/exceptions/`:
  - `ValidationException` (400) - Input validation failures
  - `BusinessLogicException` (422) - Business rule violations
  - `DomainException` (400) - Domain-specific errors
- **Database**: PostgreSQL with Prisma ORM. Schema in [src/database/prisma/schema.prisma](src/database/prisma/schema.prisma). Migrations use domain-based structure (see [src/database/prisma/migrations/domains/](src/database/prisma/migrations/domains/))

### Domain Structure Template

Each domain follows this layout (e.g., `src/domains/Order/`):

```
Order/
├── controllers/V1/        # Request handlers
├── services/              # Business logic
├── validators/V1/         # Input validation (using express-validator)
├── routes/V1/            # Route definitions
├── types/                # TypeScript interfaces
├── enums/                # Domain enums
├── events/               # Event emitters
├── models/               # Database models
└── jobs/                 # Background jobs (Bull queues)
```

## Critical Developer Workflows

### Database Workflows

```bash
# Development migration
pnpm db:migrate          # Create/run migrations interactively

# Production deployment
pnpm db:migrate:deploy   # Apply pending migrations safely

# Domain-specific migrations (after modifying schema.prisma)
node apply-domain-migrations.js apply
node check-migrations.js

# Reset database (development only)
pnpm db:migrate:reset    # Wipe database and re-run all migrations
```

### Docker Environment

```bash
make up ENV=dev          # Start containers (dev environment)
make fresh               # Full reset: down -v, build, up
make shell               # Access app container shell
make logs                # View all container logs
make db-logs             # View PostgreSQL logs
```

### Development Server

```bash
pnpm dev                 # Hot-reload TypeScript with tsx watch
pnpm lint:fix            # Auto-fix ESLint issues
pnpm seed                # Populate database with initial data
```

## Code Patterns & Conventions

### Validation Pattern

Use `express-validator` in controller routes. Example from [src/domains/Auth/validators/V1/login.validator.ts](src/domains/Auth/validators/V1/login.validator.ts):

```typescript
body('username')
  .trim()
  .notEmpty()
  .withMessage('Username is required')
  .isLength({ min: 3, max: 50 });
```

### Route Definition Pattern

Mount domain routes in `src/routes/v1/index.ts`:

```typescript
router.use('/orders', orderRoutes); // Routes: /api/v1/orders
router.use('/products', productRoutes); // Routes: /api/v1/products
```

### Error Handling Pattern

Controllers throw custom exceptions, caught by `errorMiddleware` in [src/shared/middleware/error.middleware.ts](src/shared/middleware/error.middleware.ts):

```typescript
throw new ValidationException('Invalid input', errors);
throw new BusinessLogicException('Stock insufficient');
throw new DomainException('User not found');
```

### Module Aliasing

Use `@src/` prefix (configured in [tsconfig.json](tsconfig.json) and registered via `module-alias/register` in [src/index.ts](src/index.ts)):

```typescript
import { env } from '@src/shared/config/env';
import { logger } from '@src/shared/utils/logger';
```

### Authentication

- JWT-based with refresh tokens stored in Redis (if configured)
- Config: [src/shared/config/env.ts](src/shared/config/env.ts)
- Middleware: [src/shared/middleware/auth.middleware.ts](src/shared/middleware/auth.middleware.ts)

### Async Job Processing

Uses Bull queues for background tasks (e.g., audit logging in [src/shared/jobs/log-audit-action.job.ts](src/shared/jobs/log-audit-action.job.ts)). Jobs are defined per domain under `jobs/` subdirectories.

## Environment Setup

**Required env vars** (see [src/shared/config/env.ts](src/shared/config/env.ts)):

- `JWT_SECRET` - Token signing key
- `JWT_REFRESH_SECRET` - Refresh token signing key
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - "development", "staging", or "production"

**Optional**:

- `REDIS_URL` - For token blacklist and job queues
- `SMTP_*` - Email configuration

## Integration Points

- **Prisma Client**: [src/database/client.ts](src/database/client.ts) for all DB access
- **Express Middleware Stack**: Global middleware in [src/app.ts](src/app.ts) (helmet, CORS, logging)
- **Error Handling**: All errors bubble to `errorMiddleware` - no try/catch needed in routes
- **Rate Limiting**: Applied globally via `apiRateLimiter` middleware; configure in rate-limit middleware
- **CORS**: Origins configured via `ALLOWED_ORIGINS` environment variable

## Testing & Debugging

- **Linting**: `pnpm lint` uses ESLint (config: [eslint.config.js](eslint.config.js))
- **Code Format**: `pnpm format` uses Prettier
- **Local Access**: Server outputs network IP on startup; usable by other devices on the same Wi-Fi

## Codebase Scale

- ~13 main domains with versioned APIs
- TypeScript strict mode enabled
- Port 3000 by default, but configurable via `PORT` env var
