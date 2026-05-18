# Skill: Boilerplate Express.js

## Project Identity
Production-ready Express.js v5 + TypeScript REST API boilerplate with JWT auth, S3 uploads, SMTP email, Redis caching, BullMQ queues, RBAC permissions, and Prisma ORM.

## Tech Stack (Quick Reference)
- Node.js v24+, TypeScript ES2022, ESM (`"type": "module"`)
- Express v5, Prisma v7 + PostgreSQL, BullMQ + Redis
- JWT (access + refresh), bcrypt, Zod v4, Pino logger
- S3-compatible storage, Nodemailer SMTP
- Jest + Supertest for testing

## Path Aliases
```
@/         → src/
__tests__/ → __tests__/
```
Always use `.js` extension in imports (TS ESM convention).

## Directory Map

### src/
```
src/app.ts                       — HTTP server entry
src/worker.ts                    — BullMQ worker entry
src/configs/
  express.ts                     — Express setup (helmet, cors, compression, pino-http, routes, error handlers)
  database.ts                    — Prisma Client singleton (pg Pool adapter)
  redis.ts                       — ioredis client singleton (graceful fallback)
  bull.ts                        — BullMQ connection (shares Redis)
src/routes/index.ts              — Root router: /api/auth, /api/files
src/middlewares/
  authMiddleware.ts              — JWT verify + Redis token check + DB user lookup
  errorHandler.ts                — Global error handler + 404 not-found
  multerMiddleware.ts            — Dynamic multer uploader factory
  rbacMiddleware.ts              — requirePermission(resource, action) guard
src/features/
  auth/
    auth.routes.ts               — 9 endpoints
    controllers/auth.controller.ts    — Request handler
    services/auth.service.ts         — Business logic
    repositories/auth.repository.ts  — Prisma data access
    validations/auth.validation.ts   — Zod schemas
    types/auth.types.ts              — Inferred types
  file/
    file.routes.ts               — 5 endpoints (upload, base64, get, delete, queue)
src/queues/upload.queue.ts       — BullMQ Queue definition
src/workers/upload.worker.ts     — BullMQ Worker (concurrency: 5)
src/jobs/upload.job.ts           — Job processor
src/utils/
  encryption.ts                  — AES-256-GCM encrypt/decrypt
  jwt.ts                         — JWT sign/verify (access + refresh)
  tokenStore.ts                  — Redis token CRUD (graceful fallback)
  rateLimiter.ts                 — Redis sliding window rate limiter
  respons.ts                     — Standardized JSON response + DB logging + HttpStatus enum
  logger.ts                      — Pino (file rotation + console)
  s3.ts                          — S3 upload/download/delete/presigned
  smtp.ts                        — Nodemailer transport
  mail.ts                        — HTML email templates (5 types)
  pagination.ts                  — skip/take + metadata
  utils.ts                       — bcrypt hash, crypto random, email/phone validators, OTP
  signature.ts                   — HMAC-SHA256 API Key generation + verification
  healthCheck.ts                 — DB/Redis/S3/SMTP connectivity check
```

### __tests__/
```
__tests__/helpers/
  faker.helper.ts                — 18 factory functions (@faker-js/faker)
  mock.helper.ts                 — Mock factories (Request, Response, Prisma, Redis, S3, JWT, SMTP, encryption)
__tests__/integration/
  auth.api.test.ts               — Supertest integration tests
__tests__/middlewares/
  auth.middleware.test.ts        — Auth middleware unit tests
  rbac.middleware.test.ts        — RBAC middleware unit tests
  errorHandler.middleware.test.ts— Error handler unit tests
```

## Architecture Rules

### Layer Separation (Strict)
```
Routes → Controllers → Services → Repositories → Prisma/DB
```
- **Routes**: HTTP methods + middleware chains only. No logic.
- **Controllers**: Parse request, validate input (Zod), call service, format response. No business logic.
- **Services**: All business logic. Orchestrate repos and utils. Throw errors; don't catch everything.
- **Repositories**: Pure Prisma queries. Never import other utils or services.
- **Validations**: Zod schemas, export inferred types.

### Response Pattern
Every response MUST use:
```typescript
respons.success(message, data, HttpStatus.OK, res, req)
respons.error(message, error, HttpStatus.BAD_REQUEST, res, req)
```
Never use `res.status().json()` directly. Responses auto-log to DB and console.

### Error Handling
- Controllers catch service errors and call `respons.error()`
- Global `errorHandler` catches unhandled errors
- Production: hide internal details for 500 errors
- Use `apiError` class for controlled errors: `new apiError(422, "msg", "hint")`

### Authentication Flow
1. `authMiddleware.verifyToken`: Bearer token → JWT verify → Redis store check → DB user lookup → `req.user`
2. `authMiddleware.checkToken`: Lightweight version (no DB) for response logging
3. `rbacMiddleware.requirePermission(resource, action)`: Checks `rolePermission` table

### Graceful Degradation
Redis, S3, SMTP are optional. App runs without them:
- `tokenStore.ts`: Falls back to in-memory when Redis unavailable
- `rateLimiter.ts`: Allows all requests when Redis down
- `s3.ts`: Throws config errors, not crashes
- `smtp.ts`: `isSMTPConfigured` guard before sending

## Testing Conventions

### Jest Setup
- Config: `jest.config.cjs` (ts-jest, moduleNameMapper for `@/` and `__tests__/`)
- Setup: `jest.setup.cjs` (loads `.env.test`)
- Mock pattern: `jest.mock()` at top of file, then import mocked modules

### Test File Locations
- Unit tests: `src/**/*.spec.ts` (co-located) or `__tests__/middlewares/`
- Integration tests: `__tests__/integration/`
- Utils tests: `src/utils/__tests__/*.test.ts` (native node runner)

### Mock Pattern
```typescript
jest.mock("@/features/auth/services/auth.service.js", () => ({
  authServices: { register: jest.fn(), login: jest.fn() }
}));
```
Use `createMockRequest(overrides)` and `createMockResponse()` from helpers.

### Test Data
- Use `__tests__/helpers/faker.helper.ts` factories (18 generators)
- Call `setFakerSeed(number)` in `beforeAll` for reproducibility
- Never hardcode test data; use faker generators

## Database Models (Prisma)
- **user**: id (uuid), email (unique), password, roleId, isActive
- **profile**: id, name, phone, address, photo, NIK (encrypted), userId (1:1 cascade)
- **role**: id, name (unique), status
- **module**: id, name (unique)
- **resource**: id, name, moduleId, availableActions[]
- **rolePermission**: id, roleId + resourceId (unique pair), grantedActions[]
- **logs**: id, date, userId, status, data (json), method, ip

## NPM Scripts Quick Reference
| Script | Purpose |
|---|---|
| `npm run dev` | Hot-reload dev server (tsx watch) |
| `npm run build` | TypeScript compile + alias resolve |
| `npm run test:jest` | All Jest tests |
| `npm run test:unit` | Service + controller unit tests |
| `npm run test:integration` | API integration tests |
| `npm run test:report` | Jest + HTML coverage report |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run prettier` | Format all files |
| `npm start` | Production start (compiled JS) |

## Common Tasks

### Add a new feature
1. Create `src/features/<name>/` with: routes, controllers/, services/, repositories/, validations/, types/
2. Register routes in `src/routes/index.ts`
3. Write tests in `__tests__/` (unit in feature dir or `__tests__/middlewares/`, integration in `__tests__/integration/`)

### Add a new middleware
1. Create in `src/middlewares/`
2. Write test in `__tests__/middlewares/`
3. Apply to routes in feature route files

### Database changes
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <name>`
3. Update repository methods if needed
