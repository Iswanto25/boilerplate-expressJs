# Express.js & TypeScript Boilerplate

Boilerplate production-ready untuk membangun REST API menggunakan Express.js, TypeScript, dan Prisma. Arsitektur proyek ini dirancang agar modular, scalable, dan mudah dikelola.

## ✨ Fitur Utama

- **Framework**: Express.js v5 dengan TypeScript
- **Architecture**: Modular Feature-based Architecture dengan Repository Pattern + Controller-Service-Repository
- **ORM**: Prisma v7 + PostgreSQL dengan pg Pool adapter
- **Authentication**:
    - JWT-based authentication (access token 1d, refresh token 7d)
    - User registration with profile creation
    - Multi-device support (multiple refresh tokens)
    - Token storage di Redis dengan TTL
    - Profile management with photo upload (Public URL access)
    - **NIK (National ID) encryption dengan AES-256-GCM**
    - Password reset via OTP email
    - RBAC (Role-Based Access Control) dengan dynamic role & permission
- **Background Jobs**:
    - BullMQ queue untuk task asinkron (email, upload)
    - 3x retry dengan exponential backoff
    - Worker terpisah atau berjalan bersama dev server
    - Observability lengkap (active, completed, failed, error events)
- **Security**:
    - Helmet untuk HTTP headers security
    - CORS dengan konfigurasi environment-based
    - Rate limiting dengan Redis (optional)
    - Encrypt data sensitif (NIK) dengan AES-256-GCM
    - Input validation dengan Zod
    - API Signature verification (HMAC-SHA256)
    - Password hashing dengan bcrypt + pepper
    - RBAC permission checking per endpoint
- **File Management**:
    - Upload via Multer (disk sementara) + base64
    - Integrasi S3/MinIO (optional)
    - Presigned URL generation untuk direct upload
    - Auto cleanup file lama saat update
    - Validasi format & ukuran foto
- **Email System**:
    - SMTP integration (optional)
    - Dynamic HTML email templates
    - OTP email untuk password reset, verifikasi
    - SendGrid/email service-agnostic via Nodemailer
- **Audit Log**:
    - Semua HTTP request-response tercatat di tabel `logs` database
    - Queue-based async write (buffer 1000 entry, batch 10)
    - Sensitive fields otomatis di-mask sebelum logging
- **Error Handling**: Global error handler + 404 handler dengan auto-translate error ke Bahasa Indonesia
- **Logging**: Pino structured logging ke console (pretty-print di dev) + file harian di `logger/`
- **Testing**: Node.js test runner (`node --test`) untuk unit & integration tests
- **Caching**: Redis untuk rate limiting, token storage, OTP (optional with graceful degradation)
- **Path Alias**: Import menggunakan `@/` untuk menggantikan relative path

## 📂 Struktur Proyek

```
/
├── prisma/
│   ├── schema.prisma           # Database schema (User, Profile, Role, Permission, dll)
│   ├── prisma.config.ts        # Prisma v7 config (database URL)
│   ├── seed.ts                 # Database seeder
│   └── migrations/             # Database migrations
├── scripts/
│   ├── loader-hooks.mjs        # ESM loader hooks untuk testing
│   ├── test-loader.mjs         # Test loader
│   └── generateApiKey.ts       # API signature key generator
├── src/
│   ├── app.ts                  # API server entry point (production)
│   ├── dev.ts                  # Dev entry point (server + worker bersamaan)
│   ├── worker.ts               # Standalone worker entry point
│   ├── configs/
│   │   ├── express.ts          # Express app setup (middleware stack)
│   │   ├── database.ts         # Prisma client + pg Pool adapter
│   │   ├── redis.ts            # Redis client (graceful degradation)
│   │   └── bull.ts             # BullMQ connection config
│   ├── features/
│   │   ├── auth/               # Authentication feature
│   │   │   ├── controllers/    # HTTP request handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── repositories/   # Prisma data access (transaction-aware)
│   │   │   ├── validations/    # Zod schemas
│   │   │   ├── types/          # Zod-inferred types
│   │   │   ├── jobs/           # BullMQ queue + worker + job processors
│   │   │   └── auth.routes.ts  # Route definitions
│   │   └── upload/             # File upload feature (S3 presigned URL)
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── validations/
│   │       ├── types/
│   │       └── upload.routes.ts
│   ├── middlewares/
│   │   ├── authMiddleware.ts     # JWT verification + user loading
│   │   ├── rbacMiddleware.ts     # Permission check
│   │   ├── errorHandler.ts       # Global error + 404 handler (with auto-translate)
│   │   ├── multerMiddleware.ts   # File upload handler
│   │   └── requestContext.ts     # reqId, startTime, sensitive masking
│   ├── routes/
│   │   └── index.ts              # Aggregates all feature routes
│   └── utils/
│       ├── encryption.ts       # AES-256-GCM encrypt/decrypt
│       ├── jwt.ts              # JWT sign/verify helpers
│       ├── logger.ts           # Pino logger (console + file daily)
│       ├── auditLogger.ts      # Queue-based audit log ke database
│       ├── respons.ts          # respons.success/error + apiError + validateOrThrow
│       ├── pagination.ts       # Pagination helper
│       ├── rateLimiter.ts      # Redis-based rate limiter
│       ├── s3.ts               # S3/MinIO helpers (upload, presigned, delete)
│       ├── smtp.ts             # Nodemailer SMTP sender (singleton transporter)
│       ├── mail.ts             # HTML email templates
│       ├── tokenStore.ts       # Redis token CRUD (access, refresh, OTP)
│       ├── utils.ts            # bcrypt, email/phone validation, OTP, pLimit
│       ├── signature.ts        # HMAC-SHA256 API key verification
│       └── healthCheck.ts      # Service health check
├── __tests__/
│   ├── integration/            # Integration tests
│   └── debug-test.mjs          # Debug helper
├── logger/                     # Log file output harian
├── uploads/                    # Temporary upload directory
├── CHANGELOG.md
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v24 atau lebih baru
- [PostgreSQL](https://www.postgresql.org/) 14+
- [Redis](https://redis.io/) (opsional — untuk queue, rate limiting, caching)
- [NPM](https://www.npmjs.com/) atau [Yarn](https://yarnpkg.com/)

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
    PORT=3000
    HOST=localhost
    DOMAIN=localhost
    ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

    # Database (Required)
    DATABASE_URL="your-database-connection-string"

    # Security (Required)
    DATA_ENCRYPTION_KEY="your-32-character-hex-key"
    JWT_SECRET="your-jwt-secret-key"
    JWT_REFRESH_SECRET="your-refresh-secret-key"

    # Password Security (Optional)
    SALT_HASH="your-custom-salt-string"  # Additional salt for password hashing
    SALT_ROUNDS=5                         # bcrypt salt rounds (default: 5)
    ```

    **Optional Services:**

    ```env
    # Redis (Optional - for rate limiting & token caching)
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_PASSWORD=
    REDIS_DB=0

    # S3 Storage (Optional - for file uploads)
    S3_ENDPOINT=localhost:9000
    S3_BUCKET_NAME=your-bucket
    S3_ACCESS_KEY=your-access-key
    S3_SECRET_KEY=your-secret-key
    S3_USE_SSL=false
    S3_REGION=us-east-1

    # SMTP (Optional - for email sending)
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_SECURE=false
    SMTP_USER=your-email@gmail.com
    SMTP_PASS=your-app-password
    ```

4. **Setup database:**

    ```bash
    # Generate Prisma client
    npx prisma generate

    # Run migrations
    npx prisma migrate dev
    ```

5. **Start development server (HTTP + worker bersamaan):**

    ```bash
    npm run dev
    ```

    Atau jalankan worker secara terpisah (terminal lain):

    ```bash
    npm run worker:dev
    ```

    Server akan berjalan di `http://localhost:3000`

## 📜 Available Scripts

| Script                          | Description                                        |
| ------------------------------- | -------------------------------------------------- |
| `npm run dev`                   | Start development server (HTTP + worker) with hot-reload |
| `npm run worker:dev`            | Start standalone worker with hot-reload            |
| `npm run build`                 | Compile TypeScript ke JavaScript                   |
| `npm start`                     | Run production server                              |
| `npm run worker:start`          | Run standalone worker production                   |
| `npm run start:migrate`         | Run migrations dan start server                    |
| `npm test`                      | Run all tests                                      |
| `npm run test:integration`      | Run integration tests                              |
| `npm run lint`                  | Check linting errors                               |
| `npm run lint:fix`              | Fix linting errors                                 |
| `npm run prettier`              | Format code dengan Prettier                        |
| `npm run generate-api-key`      | Generate API key dengan signature                  |
| `npm run seed`                  | Run database seeder                                |
| `npm run typecheck`             | TypeScript type checking                           |

## 🧪 Testing

Project ini dilengkapi dengan test suite menggunakan **Node.js test runner** (`node --test`):

```bash
# Run all tests
npm test

# Run integration tests only
npm run test:integration
```

## 🔒 Security Features

- ✅ **Helmet** - Secure HTTP headers
- ✅ **CORS** - Configurable cross-origin requests
- ✅ **Rate Limiting** - Prevent API abuse (with Redis)
- ✅ **Data Encryption** - Sensitive data encryption
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Input Validation** - Request payload validation
- ✅ **Error Handling** - Secure error responses (no stack traces in production)
- ✅ **Password Hashing** - Enhanced bcrypt integration with:
    - Configurable salt rounds (SALT_ROUNDS environment variable)
    - Additional custom salt hash (SALT_HASH environment variable)
    - Double-layer hashing for extra security

## 🔐 API Signature

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

Gunakan script yang sudah disediakan:

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

### Implementasi di Route

```typescript
import { Router } from "express";
import { verifyApiKey } from "../utils/signature";

const router = Router();

// Protected endpoint dengan signature
router.get("/protected", verifyApiKey, (req, res) => {
	res.json({ message: "Access granted!" });
});

export default router;
```

### Testing dengan cURL

```bash
# Generate API key
npm run generate-api-key

# Test protected endpoint
curl -H "x-api-key: YOUR_GENERATED_API_KEY" http://localhost:3004/api/example/protected

# Test public endpoint (tidak perlu API key)
curl http://localhost:3004/api/example/public
```

### Response Format

**Success (200):**

```json
{
	"success": true,
	"message": "Access granted",
	"data": {
		"message": "Ini adalah endpoint yang dilindungi dengan API signature",
		"timestamp": "2024-12-24T07:00:00.000Z",
		"info": "API Key Anda valid!"
	}
}
```

**Error (401):**

```json
{
	"success": false,
	"message": "API key tidak ditemukan"
}
```

```json
{
	"success": false,
	"message": "API key sudah expired atau tidak valid"
}
```

```json
{
	"success": false,
	"message": "Signature API key tidak valid"
}
```

## 🔌 Optional Services

### Redis (Optional)

- **Purpose**: Rate limiting dan token caching
- **If not configured**:
    - Rate limiting dilewati dengan warning log
    - Token storage dilewati dengan warning log
    - Aplikasi tetap berjalan normal

### S3 Storage (Optional)

- **Purpose**: File upload dan storage
- **If not configured**:
    - File routes return 503 Service Unavailable
    - Warning ditampilkan saat startup
- **Features**:
    - Multipart file upload
    - Base64 upload support
    - Presigned URL generation
    - File deletion

### SMTP (Optional)

- **Purpose**: Email sending (notifications, password reset, etc)
- **If not configured**:
    - Email operations dilewati dengan warning log
    - Aplikasi tetap berjalan normal

**Note**: Hanya Database yang wajib dikonfigurasi. Semua layanan lain bersifat optional dan aplikasi akan gracefully degrade jika tidak tersedia.

## 📝 API Endpoints

### Health Check

```http
GET /health
```

Response:

```json
{
	"status": "ok",
	"timestamp": "2024-12-24T07:00:00.000Z",
	"environment": "development"
}
```

### Authentication

| Method   | Endpoint                          | Description                                    | Middleware                     |
| -------- | --------------------------------- | ---------------------------------------------- | ------------------------------ |
| `POST`   | `/api/auth/register`              | Register user baru (optional photo base64)     |                                |
| `POST`   | `/api/auth/login`                 | Login user, return tokens + user data          |                                |
| `POST`   | `/api/auth/refresh-token`         | Refresh access token                           |                                |
| `POST`   | `/api/auth/logout`                | Logout, hapus tokens dari Redis                | `auth`                         |
| `GET`    | `/api/auth/profile`               | Get profile user (decrypted NIK)               | `auth`                         |
| `PATCH`  | `/api/auth/profile`               | Update profil (name, phone, address, NIK)      | `auth`                         |
| `PATCH`  | `/api/auth/profile/photo`         | Update foto via Multer upload                  | `auth`, `multer`               |
| `PATCH`  | `/api/auth/profile/photo/direct`  | Update foto via S3 presigned URL               | `auth`                         |
| `DELETE` | `/api/auth/profile/:id`           | Hapus akun + cleanup S3                        | `auth`                         |
| `GET`    | `/api/auth/users`                 | Get all users (paginated, searchable)          | `auth`                         |
| `POST`   | `/api/auth/forgot-password`       | Kirim email reset password link                | `rateLimiter`                  |
| `POST`   | `/api/auth/reset-password`        | Reset password dengan token                    | `rateLimiter`                  |
| `POST`   | `/api/auth/send-otp`              | Kirim OTP email                                | `rateLimiter`                  |
| `POST`   | `/api/auth/verify-otp`            | Verifikasi OTP                                 | `rateLimiter`                  |

### File Upload (requires S3 Storage)

| Method   | Endpoint                       | Description                          |
| -------- | ------------------------------ | ------------------------------------ |
| `POST`   | `/api/upload/presigned-url`    | Generate S3 presigned upload URL     |
| `POST`   | `/api/upload/confirm`          | Confirm file upload ke S3            |

### API Signature Examples

| Method | Endpoint                 | Description                                              |
| ------ | ------------------------ | -------------------------------------------------------- |
| `GET`  | `/api/example/protected` | Endpoint dilindungi signature (butuh `x-api-key` header) |
| `GET`  | `/api/example/public`    | Endpoint publik (tanpa autentikasi)                      |

## 📧 Email Templates

Project ini menyediakan email template system yang modular dan reusable.

### Available Templates

- **OTP Email** - Untuk password reset
- **Forgot Password Email** - Link reset password
- **Generic OTP Email** - Customizable untuk berbagai keperluan

### Usage Example

```typescript
import { generateOTPEmail } from "../utils/mail";
import { sendEmail } from "../utils/smtp";

const html = generateOTPEmail("John Doe", "123456");
await sendEmail({
	to: "user@example.com",
	subject: "Reset Password",
	html,
	fromName: process.env.APP_NAME,
	fromEmail: process.env.SMTP_USER,
});
```

## 🛠️ Tech Stack

Core Dependencies:

- **express** (v5.1.0) - Web framework
- **typescript** (v5.9.3) - Type safety
- **@prisma/client** (v7.4.2) - Database ORM (PostgreSQL)
- **@prisma/adapter-pg** (v7.4.2) - PostgreSQL adapter
- **bullmq** (v5.76.6) - Background job queue
- **ioredis** (v5.8.2) - Redis client
- **jsonwebtoken** (v9.0.2) - JWT authentication
- **bcrypt** (v6.0.0) - Password hashing
- **zod** (v4.3.6) - Schema validation
- **nodemailer** (v7.0.10) - Email sending
- **@aws-sdk/client-s3** (v3.917.0) - S3/MinIO storage
- **pino** (v10.1.0) - Structured logging
- **multer** (v2.0.2) - File upload handling
- **helmet** (v8.1.0) - Security headers

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Documentation

- [CHANGELOG](./CHANGELOG.md) - Detailed version history and changes

## License

This project is licensed under the ISC License.

## Author

Created by [Iswanto25](https://github.com/Iswanto25)

## Links

- **Repository**: [github.com/Iswanto25/boilerplate-expressJs](https://github.com/Iswanto25/boilerplate-expressJs)
- **Issues**: [Report a bug or request a feature](https://github.com/Iswanto25/boilerplate-expressJs/issues)
- **Pull Requests**: [Contribute to the project](https://github.com/Iswanto25/boilerplate-expressJs/pulls)
