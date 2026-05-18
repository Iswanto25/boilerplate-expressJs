# AGENT.md — Boilerplate Express.js

## Tech Stack
- **Runtime:** Node.js + TypeScript (ES2022, ESM `"type": "module"`)
- **Framework:** Express v5
- **ORM:** Prisma v7 + PostgreSQL (`@prisma/adapter-pg`)
- **Auth:** JWT (access + refresh), bcrypt, Redis token store
- **Queue:** BullMQ + Redis
- **Storage:** S3-compatible (`@aws-sdk/client-s3`)
- **Email:** Nodemailer + SMTP
- **Validation:** Zod v4
- **Logging:** Pino (file + console)
- **Testing:** Jest + Supertest

## Path Alias
```
@/ → src/
__tests__/ → __tests__/
```
All imports use `.js` extension (TypeScript ESM convention).

## Architecture: Layered per Feature
```
Routes → Controllers → Services → Repositories → Prisma/DB
```
Every feature (`src/features/<name>/`) follows this strict separation:
- **routes** — HTTP method + middleware chain
- **controllers/** — Parse request, validate (Zod), delegate to service, format response
- **services/** — Business logic, orchestration
- **repositories/** — Pure data access (Prisma queries)
- **validations/** — Zod schemas
- **types/** — Inferred types from Zod

## Key Conventions
- All responses use `respons.success()` / `respons.error()` from `@/utils/respons.js`
- HTTP status codes from `HttpStatus` enum in `respons.ts`
- Prisma and Redis are singleton modules in `@/configs/`
- No DI container — utils and configs imported directly
- All external services (S3, SMTP, Redis) degrade gracefully
- Imports: use `.js` extension for ESM compatibility
- Test files: `*.spec.ts` for Jest, `*.test.ts` also accepted
- Mock patterns: see `__tests__/helpers/mock.helper.ts`

## Commands
| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Worker dev | `npm run worker:dev` |
| Build | `npm run build` |
| Run all tests | `npm run test:jest` |
| Unit tests | `npm run test:unit` |
| Integration tests | `npm run test:integration` |
| Coverage report | `npm run test:report` |
| Lint | `npm run lint` |
| Format | `npm run prettier` |

## Testing
- **Unit tests**: `__tests__/middlewares/`, `__tests__/services/`, `__tests__/controllers/`
- **Integration tests**: `__tests__/integration/`
- **Test helpers**: `__tests__/helpers/faker.helper.ts` + `mock.helper.ts`
- Pattern: `jest.mock()` at top, mock services/repos, test controllers in isolation
- Use `createMockRequest()` and `createMockResponse()` from helpers

## Database (Prisma)
- Schema: `prisma/schema.prisma`
- Models: user, profile, role, module, resource, rolePermission, logs
- Migrations: `prisma/migrations/`
- Use `prisma.$transaction()` for multi-table operations
- Use `.findFirst()` over `.findUnique()` when querying by non-unique fields
