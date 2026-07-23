# Express.js & TypeScript Boilerplate

Boilerplate production-ready untuk membangun REST API menggunakan Express.js 5, TypeScript, dan Prisma 7. Arsitektur modular berbasis fitur dengan Repository Pattern, RBAC, background jobs (BullMQ), dan S3/MinIO storage.

## Fitur Utama

- **Framework**: Express.js 5 dengan TypeScript (ESM, bundler moduleResolution)
- **Architecture**: Modular Feature-based Architecture — Controller → Service → Repository + Transaction-aware
- **ORM**: Prisma 7 + PostgreSQL dengan pg Pool adapter + Prisma Config API (`defineConfig`)
- **Authentication**:
  - JWT-based authentication (access token 15m, refresh token 7d)
  - Multi-device support (refresh tokens di Redis)
  - Token storage di Redis dengan TTL + graceful degradation
  - Profile management + photo upload (Multer & S3 presigned URL)
  - **NIK encryption** dengan AES-256-GCM
  - Forgot password & reset password via BullMQ job + email
  - OTP verification dengan purpose validation & expiry 5 menit
  - RBAC (Role-Based Access Control) dengan dynamic role & permission
- **Background Jobs**:
  - BullMQ queue untuk task asinkron (email OTP, forgot password, photo upload)
  - 3x retry dengan exponential backoff
  - Worker terpisah atau berjalan bersama dev server
  - Event listener: active, completed, failed, error
- **Security**:
  - Helmet (CSP, HSTS, XSS, etc.) — konfigurasi lengkap
  - CORS environment-based dengan credentials support
  - Rate limiting dengan Redis (optional, configurable per-endpoint)
  - Encrypt data sensitif (NIK) dengan AES-256-GCM
  - Input validation dengan Zod (`validateOrThrow` via `.safeParse()`)
  - API Signature verification (HMAC-SHA256) untuk endpoint tertentu
  - Password hashing dengan bcrypt + pepper (SALT_HASH)
  - RBAC permission checking per endpoint
- **File Management**:
  - Upload via Multer (disk sementara) + base64 processing via BullMQ
  - Integrasi S3/MinIO (optional)
  - Presigned URL generation untuk direct upload
  - Auto cleanup file lama saat update profile
  - Validasi format & ukuran foto
- **Email System**:
  - SMTP integration via Nodemailer (optional, singleton transporter)
  - Dynamic HTML email templates (OTP, forgot password, generic)
  - Background email sending via BullMQ
- **Audit Log**:
  - Semua HTTP request-response tercatat di tabel `logs` database
  - Queue-based async write (buffer 1000 entry, batch 10)
  - Sensitive fields otomatis di-mask sebelum logging
- **Error Handling**: Global error handler + 404 handler dengan auto-translate error ke Bahasa Indonesia
- **Logging**: Pino structured logging ke console (pretty-print di dev) + file harian di `logger/`
- **Testing**: Node.js test runner (`node --test`) untuk unit (10 files) & integration tests
- **Caching**: Redis untuk token storage, rate limiting, OTP (optional with graceful degradation)
- **Path Alias**: Import menggunakan `@/` untuk menggantikan relative path (resolved via tsc-alias)

## Struktur Proyek

```
/
├── prisma/
│   ├── schema.prisma           # Database schema (User, Profile, Role, Permission, dll)
│   ├── prisma.config.ts        # Prisma v7 config (defineConfig)
│   ├── seed.ts                 # Database seeder (role, module, resource, permission)
│   └── migrations/             # Database migrations
├── scripts/
│   ├── loader-hooks.mjs        # ESM loader hooks untuk testing
│   ├── test-loader.mjs         # Test loader
│   ├── prepare-test-env.cjs    # Pretest hook
│   └── generateApiKey.ts       # API signature key generator
├── src/
│   ├── app.ts                  # Production entry — cluster mode (multi-CPU)
│   ├── dev.ts                  # Dev entry — server + worker combined
│   ├── worker.ts               # Standalone BullMQ worker entry
│   ├── configs/
│   │   ├── express.ts          # Express app setup (helmet CSP, cors, compression)
│   │   ├── database.ts         # Prisma client singleton
│   │   ├── redis.ts            # Redis client (graceful degradation via redisState)
│   │   └── bull.ts             # BullMQ connection config
│   ├── features/
│   │   ├── auth/               # Auth: register, login, logout, refresh, profile, forgot-password, OTP
│   │   │   ├── controllers/    # HTTP request handlers + spec
│   │   │   ├── services/       # Business logic
│   │   │   ├── repositories/   # Prisma data access (transaction-aware)
│   │   │   ├── validations/    # Zod schemas
│   │   │   ├── types/          # Zod-inferred types
│   │   │   ├── jobs/           # BullMQ queue + worker + job processors
│   │   │   └── auth.routes.ts  # Route definitions
│   │   └── upload/             # File upload (S3 presigned URL)
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── jobs/           # BullMQ queue setup
│   │       ├── validations/
│   │       ├── types/
│   │       └── upload.routes.ts
│   ├── middlewares/
│   │   ├── authMiddleware.ts     # JWT verification + user loading
│   │   ├── rbacMiddleware.ts     # Permission check
│   │   ├── errorHandler.ts       # Global error + 404 handler (auto-translate)
│   │   ├── multerMiddleware.ts   # File upload (multer)
│   │   └── requestContext.ts     # reqId, startTime, sensitive masking
│   ├── routes/
│   │   └── index.ts              # Aggregates auth + upload routes under /api
│   └── utils/
│       ├── __tests__/            # 10 unit test files
│       ├── auditLogger.ts        # Queue-based audit log ke database
│       ├── encryption.ts         # AES-256-GCM encrypt/decrypt
│       ├── healthCheck.ts        # Service health check
│       ├── jwt.ts                # JWT sign/verify helpers
│       ├── logger.ts             # Pino logger (console + file daily rotate)
│       ├── mail.ts               # HTML email templates
│       ├── pagination.ts         # Pagination helper
│       ├── rateLimiter.ts        # Redis-based rate limiter
│       ├── respons.ts            # respons.success/error + apiError + validateOrThrow
│       ├── s3.ts                 # S3/MinIO helpers
│       ├── signature.ts          # HMAC-SHA256 API key verification
│       ├── smtp.ts               # Nodemailer SMTP sender (singleton)
│       ├── tokenStore.ts         # Redis token CRUD
│       └── utils.ts              # bcrypt, email/phone validation, OTP, pLimit
├── __tests__/
│   ├── helpers/
│   │   ├── faker.helper.ts       # Fake data generation
│   │   └── mock.helper.ts        # Module mocking helpers
│   └── integration/
│       └── auth.api.test.ts      # Auth integration tests
├── logger/                     # Log file output harian
├── uploads/                    # Temporary upload directory
├── CHANGELOG.md
└── README.md
```

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v24 atau lebih baru
- [PostgreSQL](https://www.postgresql.org/) 14+
- [Redis](https://redis.io/) (opsional — untuk queue, rate limiting, caching)
- [NPM](https://www.npmjs.com/)

### Installation

1. **Clone repository:**

    ```bash
    git clone git@github.com:Iswanto25/boilerplate-expressJs.git
    cd boilerplate-expressJs
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Setup environment variables:**

    Salin `.env.example` menjadi `.env`:

    ```bash
    cp .env.example .env
    ```

    **Required Variables:**

    ```env
    # Application
    NODE_ENV=development
    PORT=3004
    HOST=0.0.0.0
    DOMAIN=localhost
    ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

    # Database (Required)
    DATABASE_URL=postgresql://user:password@localhost:5432/dbname

    # Security (Required)
    DATA_ENCRYPTION_KEY=your-32-char-hex-key-here-change-this-in-production
    JWT_SECRET=your-jwt-secret-change-this-in-production
    JWT_REFRESH_SECRET=your-refresh-secret-change-this-in-production
    ACCESS_TOKEN_EXPIRES_IN=15m
    REFRESH_TOKEN_EXPIRES_IN=7d

    # Password Security (Optional)
    SALT_HASH=your-custom-salt-string  # Additional salt for password hashing
    SALT_ROUNDS=5                       # bcrypt salt rounds (default: 5)
    ```

    **Optional Services:**

    ```env
    # Redis (Optional - for queue, rate limiting & token storage)
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_PASSWORD=
    REDIS_DB=0

    # S3 Storage (Optional - for file uploads)
    S3_ENDPOINT=localhost
    S3_PORT=9000
    S3_BUCKET_NAME=uploads
    S3_ACCESS_KEY=your-access-key
    S3_SECRET_KEY=your-secret-key
    S3_USE_SSL=false
    S3_REGION=us-east-1

    # SMTP (Optional - for email sending)
    APP_NAME=Boilerplate Express
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_SECURE=false
    SMTP_USER=your-email@gmail.com
    SMTP_PASS=your-app-password
    SMTP_FROM=noreply@yourdomain.com
    ```

4. **Setup database:**

    ```bash
    # Generate Prisma client
    npx prisma generate

    # Run migrations
    npx prisma migrate dev

    # Seed database (role, module, resource, permission)
    npm run seed
    ```

5. **Start development server (HTTP + worker bersamaan):**

    ```bash
    npm run dev
    ```

    Atau jalankan worker secara terpisah (terminal lain):

    ```bash
    npm run worker:dev
    ```

    Server akan berjalan di `http://localhost:3004`

## Available Scripts

| Script                          | Description                                        |
| ------------------------------- | -------------------------------------------------- |
| `npm run dev`                   | Start dev server + worker (tsx watch)              |
| `npm run worker:dev`            | Start standalone worker (tsx watch)                |
| `npm run build`                 | Compile TypeScript + resolve path aliases          |
| `npm start`                     | Run production server (cluster mode)               |
| `npm run worker:start`          | Run standalone worker production                   |
| `npm run start:migrate`         | Run migrations dan start server                    |
| `npm test`                      | Run all tests (node --test)                        |
| `npm run test:integration`      | Run integration tests                              |
| `npm run lint`                  | Check linting errors (ESLint)                      |
| `npm run lint:fix`              | Fix linting errors                                 |
| `npm run typecheck`             | TypeScript type checking                           |
| `npm run prettier`              | Format code dengan Prettier                        |
| `npm run generate-api-key`      | Generate API key dengan signature                  |
| `npm run generate-data`         | Generate sample data                               |
| `npm run seed`                  | Run database seeder                                |

## Testing

Project ini menggunakan **Node.js test runner** (`node --test`):

```bash
# Run all tests
npm test

# Run integration tests only
npm run test:integration
```

Test command: `node --import tsx/esm --import ./scripts/test-loader.mjs --experimental-test-module-mocks --test`

- **Unit tests**: 10 files di `src/utils/__tests__/` (encryption, jwt, logger, pagination, rateLimiter, respons, s3, smtp, tokenStore, utils)
- **Integration tests**: `__tests__/integration/auth.api.test.ts`
- **Mock helpers**: `faker.helper.ts` (fake data), `mock.helper.ts` (module mocking)

## Security Features

- Helmet — Secure HTTP headers (CSP, HSTS, XSS, etc.)
- CORS — Configurable cross-origin requests
- Rate Limiting — Prevent API abuse (with Redis)
- Data Encryption — Sensitive data (NIK) dengan AES-256-GCM
- JWT Authentication — Secure token-based auth
- Input Validation — Request payload validation via Zod (`validateOrThrow`)
- Error Handling — Secure error responses (no stack traces in production)
- Password Hashing — Enhanced bcrypt integration with:
  - Configurable salt rounds (`SALT_ROUNDS` environment variable)
  - Additional custom salt hash (`SALT_HASH` environment variable)
  - Double-layer hashing for extra security

## API Signature

Boilerplate ini menyediakan sistem API Signature untuk melindungi endpoint tertentu dengan HMAC-SHA256 signature.

### Cara Kerja

1. **Generate API Key**: Client membuat API key dengan format `base64(userKey:timestamp:signature)`
2. **Signature**: Dibuat dengan HMAC-SHA256 dari `userKey:timestamp` menggunakan `SECRET_KEY`
3. **Verify**: Server memverifikasi signature dan memeriksa expiry (default: 5 menit)

### Setup

Tambahkan ke `.env`:

```env
USER_KEY=your-user-key-change-this-in-production
SECRET_KEY=your-secret-key-change-this-in-production
```

### Generate API Key

```bash
npm run generate-api-key
```

Output:

```
========================================
🔑 API Key Generator
========================================
User Key: your-user-key
API Key: eW91ci11c2VyLWtleToxNzA2NTE0MDAwMDAwOmFiY2RlZjEyMzQ1Njc4OTA=
========================================

📝 Cara menggunakan:
Tambahkan header berikut pada request:
x-api-key: eW91ci11c2VyLWtleToxNzA2NTE0MDAwMDAwOmFiY2RlZjEyMzQ1Njc4OTA=

⏰ Catatan:
API Key ini valid selama 5 menit
========================================
```

### Testing dengan cURL

```bash
# Generate API key
npm run generate-api-key

# Test protected endpoint
curl -H "x-api-key: YOUR_GENERATED_API_KEY" http://localhost:3004/api/example/protected
```

## Optional Services

### Redis (Optional)

- **Purpose**: Queue (BullMQ), rate limiting, token storage, OTP
- **If not configured**:
  - BullMQ queue tidak aktif (background jobs gagal)
  - Rate limiting dilewati dengan warning log
  - Token storage di-skip (auth tetap jalan via JWT verification)
  - Graceful degradation — aplikasi tetap berjalan

### S3 Storage (Optional)

- **Purpose**: File upload dan storage
- **If not configured**:
  - File routes return 503 Service Unavailable
  - Warning ditampilkan saat startup
- **Features**:
  - Presigned URL generation
  - File upload + delete
  - Public URL access via `STORAGE_PUBLIC_URL`

### SMTP (Optional)

- **Purpose**: Email sending (forgot password, OTP notification)
- **If not configured**:
  - Email operations dilewati dengan warning log
  - Aplikasi tetap berjalan normal

**Note**: Hanya Database yang wajib dikonfigurasi. Semua layanan lain bersifat optional dan aplikasi akan gracefully degrade jika tidak tersedia.

## API Endpoints

### Health Check

```http
GET /health
```

Response:

```json
{
	"success": true,
	"message": "Service is healthy",
	"data": {
		"status": "ok",
		"timestamp": "2026-07-23 10:00:00",
		"version": "1.0.0",
		"environment": "development"
	}
}
```

### Authentication (`/api/auth`)

| Method   | Endpoint                    | Auth Required | Description                        |
| -------- | --------------------------- | ------------- | ---------------------------------- |
| `POST`   | `/register`                 | No            | Register user baru                 |
| `POST`   | `/login`                    | No            | Login, return tokens               |
| `POST`   | `/logout`                   | Yes           | Logout, hapus tokens dari Redis    |
| `POST`   | `/refresh-token`            | Yes           | Refresh access token               |
| `GET`    | `/profile`                  | Yes           | Get profile (decrypted NIK)        |
| `PATCH`  | `/profile`                  | Yes           | Update profil                      |
| `PATCH`  | `/profile/photo`            | Yes           | Update foto via Multer             |
| `PATCH`  | `/profile/photo/direct`     | Yes           | Update foto via S3 presigned       |
| `DELETE` | `/profile/:id`              | Yes           | Hapus akun + cleanup S3            |
| `GET`    | `/users`                    | Yes           | Get all users (paginated)          |
| `POST`   | `/forgot-password`          | No            | Kirim email reset password         |
| `POST`   | `/reset-password`           | No            | Reset password dengan token        |
| `POST`   | `/send-otp`                 | No            | Kirim OTP email                    |
| `POST`   | `/verify-otp`               | No            | Verifikasi OTP                     |

### Upload (`/api/upload`)

| Method   | Endpoint           | Auth Required | Description                      |
| -------- | ------------------ | ------------- | -------------------------------- |
| `POST`   | `/presigned-url`   | Yes           | Generate S3 presigned upload URL |
| `POST`   | `/confirm`         | Yes           | Confirm file upload ke S3        |

## Email Templates

Project ini menyediakan email template system yang modular dan reusable.

### Available Templates

- **OTP Email** — Untuk verifikasi OTP
- **Reset Password Email** — Link reset password
- **Generic OTP Email** — Customizable untuk berbagai keperluan

### Usage

```typescript
import { generateOTPEmail } from "../utils/mail.js";
import { sendEmail } from "../utils/smtp.js";

const html = generateOTPEmail("John Doe", "123456");
await sendEmail({
	to: "user@example.com",
	subject: "Reset Password",
	html,
	fromName: process.env.APP_NAME,
	fromEmail: process.env.SMTP_USER,
});
```

## Tech Stack

**Core Dependencies:**

- **express** (v5.1.0) — Web framework
- **typescript** (v5.9.3) — Type safety
- **@prisma/client** (v7.4.2) — Database ORM (PostgreSQL)
- **@prisma/adapter-pg** (v7.4.2) — PostgreSQL adapter
- **bullmq** (v5.76.6) — Background job queue
- **ioredis** (v5.8.2) — Redis client
- **jsonwebtoken** (v9.0.2) — JWT authentication
- **bcrypt** (v6.0.0) — Password hashing
- **zod** (v4.3.6) — Schema validation
- **nodemailer** (v9.0.3) — Email sending
- **@aws-sdk/client-s3** (v3.917.0) — S3/MinIO storage
- **pino** (v10.1.0) — Structured logging
- **multer** (v2.0.2) — File upload handling
- **helmet** (v8.1.0) — Security headers
- **pino-pretty** (v13.1.2) — Pretty-print logging di dev

## Documentation

- [CHANGELOG](./CHANGELOG.md) — Detailed version history and changes

## License

ISC License

## Author

Created by [Iswanto25](https://github.com/Iswanto25)

## Links

- **Repository**: [github.com/Iswanto25/boilerplate-expressJs](https://github.com/Iswanto25/boilerplate-expressJs)
- **Issues**: [Report a bug or request a feature](https://github.com/Iswanto25/boilerplate-expressJs/issues)
- **Pull Requests**: [Contribute to the project](https://github.com/Iswanto25/boilerplate-expressJs/pulls)
