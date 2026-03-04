# Unit Tests

Direktori ini berisi unit tests dan integration tests untuk Express.js application.

## Struktur

```
__tests__/
├── helpers/          # Helper utilities untuk testing
├── services/         # Unit tests untuk service layer
├── controllers/      # Unit tests untuk controller layer
└── integration/      # Integration tests untuk API endpoints
```

## Helpers

### faker.helper.ts

Helper untuk generate dummy data menggunakan `@faker-js/faker`:

- `generateFakeUser()` - Generate user object
- `generateFakeRegisterData()` - Generate registration data
- `generateFakeLoginData()` - Generate login credentials
- `generateBulkRegisterData(count)` - Generate bulk registration data
- `setFakerSeed(seed)` - Set seed untuk konsistensi
- Dan banyak lagi...

### mock.helper.ts

Helper untuk create mock objects:

- `createMockRequest()` - Mock Express Request
- `createMockResponse()` - Mock Express Response
- `createMockPrismaClient()` - Mock Prisma Client
- `createMockAuthenticatedUser()` - Mock authenticated user
- Dan lainnya...

## Menjalankan Tests

Lihat [TESTING.md](../docs/TESTING.md) untuk panduan lengkap.

### Quick Start

```bash
# Run all tests
npm run test:jest

# Run with coverage
npm run test:jest:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode
npm run test:jest:watch
```

## Contoh Usage

Lihat file-file test yang sudah ada untuk contoh penggunaan yang lengkap.
