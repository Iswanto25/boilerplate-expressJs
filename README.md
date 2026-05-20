# Express.js & TypeScript Boilerplate (Bun Native)

Boilerplate production-ready untuk membangun REST API menggunakan Express.js, TypeScript, dan Prisma, dioptimalkan sepenuhnya untuk **Bun**. Arsitektur proyek ini dirancang agar modular, scalable, dan mendukung sistem otorisasi yang kompleks.

## 🧠 Filosofi Arsitektur

Boilerplate ini dikembangkan dengan prinsip **"Scalability through Simplicity & Separation"**. Berikut adalah pilar utama arsitektur kami:

### 1. Modular Feature-based Architecture

Berbeda dengan pola MVC tradisional yang mengelompokkan file berdasarkan _tipe_ (semua controller di satu folder), kami mengelompokkan berdasarkan **Fitur**.

- Setiap fitur (misal: `auth`) memiliki ekosistem sendiri: controller, service, repository, validation, dan jobs.
- **Manfaat**: Memudahkan navigasi saat proyek membesar dan memungkinkan penghapusan atau penambahan fitur secara terisolasi tanpa merusak bagian lain.

### 2. Separation of Concerns (SoC) dengan Repository Pattern

Kami membagi tanggung jawab ke dalam lapisan yang jelas:

- **Controllers**: Hanya menangani request/response dan validasi skema (Zod).
- **Services**: Berisi _Business Logic_. Di sini tempat aturan bisnis dijalankan.
- **Repositories**: Satu-satunya lapisan yang berinteraksi dengan Database (Prisma). Lapisan ini mengabstraksi kompleksitas query.
- **Jobs**: Menangani tugas berat secara asinkron (Event-driven) agar API tetap responsif.

### 3. Graceful Degradation & Resilience

Aplikasi dirancang untuk tetap berjalan meskipun layanan pendukung (Redis, S3, SMTP) tidak tersedia atau salah konfigurasi.

- **Optional Services**: Jika Redis mati, sistem akan otomatis melakukan _fallback_ ke in-memory atau melewati fungsi tersebut dengan log peringatan, bukan menghentikan seluruh aplikasi.
- **Background Jobs**: Menggunakan BullMQ untuk memastikan tugas yang gagal dapat dicoba kembali secara otomatis (_auto-retry_).

### 4. Developer Experience (DX) & Performance

- **Bun Native**: Menggunakan Bun untuk kecepatan eksekusi dan tooling yang terintegrasi (test runner, package manager).
- **Type-Safety**: Penggunaan TypeScript dan Zod memastikan error terdeteksi saat development, bukan saat runtime.
- **Path Alias**: Menghindari "relative import hell" dengan alias `@/`.

---

## ✨ Fitur Utama

- **Runtime**: **Bun**-native untuk performa eksekusi dan development yang sangat cepat
- **Framework**: Express.js v5 dengan TypeScript
- **Architecture**: Modular Feature-based Architecture dengan Repository Pattern
- **ORM**: Prisma v7 untuk database management yang modern dan type-safe
- **Authorization (RBAC)**:
    - Role-Based Access Control yang granular
    - Pengelolaan Module, Resource, dan Action-based permissions
    - Middleware `requirePermission` untuk proteksi endpoint berbasis role
- **Background Jobs**:
    - **BullMQ** integration untuk antrian tugas asinkron
    - **Single File per Feature**: Semua Queue, Worker, dan Processor dikonsolidasikan dalam satu file per fitur (misal: `auth.jobs.ts`) untuk kemudahan maintenance.
    - Dedicated **Worker** process untuk memproses jobs (upload, email, dll)
    - Redis-backed job management
- **Authentication**:
    - JWT-based authentication system (Access & Refresh tokens)
    - Multi-device login support
    - Token caching with Redis (optional)
    - Password hashing with double-layer bcrypt
- **Security**:
    - **Zod** untuk validasi skema input yang type-safe
    - Helmet untuk HTTP headers security
    - CORS dengan konfigurasi environment-based
    - Rate limiting dengan Redis (optional)
    - API Signature verification (HMAC-SHA256)
    - **NIK (National ID) encryption with AES-256-GCM**
- **File Management**:
    - Upload file via **BullMQ jobs** untuk performa tinggi
    - Integrasi S3 Storage (optional)
    - Support base64 upload untuk images
    - Public URL access for secure file delivery
- **Logging & Monitoring**:
    - Structured logging dengan **Pino** dan **pino-http**
    - Database logging (audit trail) via `logs` model
    - Performance profiling & auto-generated reports
- **Error Handling**: Global error handler dan custom HTTP exceptions
- **Code Quality**: ESLint, Prettier, dan Comprehensive test suite dengan Jest & Bun Test
- **Path Alias**: Import menggunakan alias `@/` (misal: `@/utils/jwt`)

## 📂 Struktur Proyek

```
/
├── prisma/
│   ├── schema.prisma        # Database schema (User, Role, Permission, Logs)
│   ├── prisma.config.ts     # Prisma v7 config
│   └── migrations/          # Database migrations
├── src/
│   ├── app.ts               # API entry point
│   ├── worker.ts            # Worker process entry point
│   ├── configs/             # BullMQ, Redis, Database, Express configs
│   ├── features/            # Feature-based modules
│   │   └── auth/            # Auth feature
│   │       ├── jobs/        # Background jobs (auth.jobs.ts)
│   │       ├── controllers/
│   │       ├── repositories/
│   │       ├── services/
│   │       └── validations/
│   ├── middlewares/         # Custom middlewares (Auth, RBAC, Multer)
│   ├── routes/              # API route definitions
│   └── utils/               # Utility functions (Encryption, JWT, Mail, S3)
├── .env.example             # Environment variables template
├── CHANGELOG.md             # Project changelog
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.1 atau lebih baru
- Database yang didukung Prisma (PostgreSQL, MySQL, SQLite, dll)
- Redis server (untuk BullMQ & caching)

### Installation

1. **Clone repository:**

    ```bash
    git clone git@github.com:Iswanto25/boilerplate-expressJs.git
    cd boilerplate-expressJs
    ```

2. **Install dependencies:**

    ```bash
    bun install
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

    > [!IMPORTANT]
    > **Catatan Prisma v7:** Proyek ini menggunakan **Prisma v7** (pastikan `prisma` dan `@prisma/client` minimal versi 7).
    > Berbeda dengan versi lama, pada versi 7 koneksi URL diletakkan di `prisma.config.ts`, bukan di dalam `schema.prisma`. File `prisma.config.ts` membutuhkan `dotenv` untuk membaca `.env`.

    Karena ini adalah proyek Bun dan menggunakan Prisma v7, gunakan `bunx` agar konfigurasi tereksekusi dengan sempurna:

    ```bash
    # Generate Prisma client
    bunx prisma generate

    # Run migrations
    bunx prisma migrate dev
    ```

5. **Cara Menjalankan:**

    Proyek ini memiliki **dua proses** yang berjalan terpisah:

    ### 📡 Development (`dev.ts`)

    **Satu command menjalankan API Server + Worker sekaligus.**

    ```bash
    bun run dev
    ```

    Server akan berjalan di `http://localhost:3000` dan worker siap memproses background job (upload file, kirim email, dll).

    ### 🚀 Production

    Di production, API server dan worker dijalankan terpisah agar bisa di-scale independently.

    **API Server:**
    ```bash
    bun run build
    bun run start
    ```

    **Worker:**
    ```bash
    bun run worker:start
    ```

    ### 🏃 Urutan Menjalankan (Development)

    1. Pastikan PostgreSQL dan Redis sudah berjalan
    2. Setup database: `npx prisma generate && npx prisma migrate dev`
    3. Jalankan: `bun run dev`
    4. Server + Worker siap di `http://localhost:3000`

## 📜 Available Scripts

| Script                     | Description                                |
| -------------------------- | ------------------------------------------ |
| `bun run dev`              | Start development server dengan hot-reload |
| `bun run worker:dev`       | Start worker dengan hot-reload             |
| `bun run build`            | Compile TypeScript ke JavaScript           |
| `bun run start`            | Run production server                      |
| `bun run worker:start`     | Run production worker                      |
| `bun run start:migrate`    | Run migrations dan start server            |
| `bun test`                 | Run test suite                             |
| `bun run lint`             | Check linting errors                       |
| `bun run lint:fix`         | Fix linting errors                         |
| `bun run prettier`         | Format code dengan Prettier                |
| `bun run generate-api-key` | Generate API key dengan signature          |
| `bun run generate-data`    | Generate dummy data (Users, Roles, etc)    |

## 🧪 Testing

Project ini dilengkapi dengan comprehensive test suite:

```bash
# Run all tests
bun test

# Run specifically with Jest
bun run test:jest
```

Test coverage meliputi:

- Encryption utilities
- JWT token management
- Response formatting
- Rate limiting
- S3 file operations
- SMTP configuration
- Token storage

### 📮 API Testing dengan Postman

Project ini juga sudah dilengkapi dengan Postman Collection yang terintegrasi (auto-set token).

1. Buka aplikasi **Postman**.
2. Klik **Import** dan pilih file `postman_collection.json` di root direktori proyek ini.
3. Environment variables seperti `{{baseUrl}}`, `{{token}}`, dan `{{refreshToken}}` sudah siap pakai. Endpoint `Login` akan otomatis mengisi variabel token setelah berhasil login.

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
bun run generate-api-key
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
import { requirePermission } from "../middlewares/rbacMiddleware";

const router = Router();

// Protected endpoint dengan signature & RBAC
router.get("/protected", verifyApiKey, requirePermission("example", "read"), (req, res) => {
	res.json({ message: "Access granted!" });
});

export default router;
```

### Testing dengan cURL

```bash
# Generate API key
bun run generate-api-key

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

| Method   | Endpoint                    | Description                                      |
| -------- | --------------------------- | ------------------------------------------------ |
| `POST`   | `/api/auth/register`        | Register user baru dengan profil & foto (base64) |
| `POST`   | `/api/auth/login`           | Login user, mengembalikan data user + foto URL   |
| `POST`   | `/api/auth/refresh-token`   | Refresh access token                             |
| `POST`   | `/api/auth/logout`          | Logout user                                      |
| `GET`    | `/api/auth/profile`         | Get profil user dengan foto URL                  |
| `GET`    | `/api/auth/users`           | Get semua user dengan data profil dan foto URL   |
| `POST`   | `/api/auth/forgot-password` | Kirim OTP email untuk reset password             |
| `PUT`    | `/api/auth/profile`         | Update profil user (name, phone, address, photo) |
| `DELETE` | `/api/auth/profile`         | Hapus akun user & cleanup file S3                |

### File Upload (requires S3 Storage)

| Method   | Endpoint                       | Description                          |
| -------- | ------------------------------ | ------------------------------------ |
| `POST`   | `/api/files/upload`            | Upload file (multipart/form-data)    |
| `POST`   | `/api/files/upload-base64`     | Upload file base64 encoded           |
| `GET`    | `/api/files/:folder/:fileName` | Get direct public URL (`urlStorage`) |
| `DELETE` | `/api/files/:folder/:fileName` | Hapus file                           |

### API Signature Examples

| Method | Endpoint                 | Description                                              |
| ------ | ------------------------ | -------------------------------------------------------- |
| `GET`  | `/api/example/protected` | Endpoint dilindungi signature (butuh `x-api-key` header) |
| `GET`  | `/api/example/public`    | Endpoint publik (tanpa autentikasi)                      |

## 📧 Email Templates

Project ini menyediakan email template system yang modular dan reusable. Lihat [Email Templates Documentation](./docs/EMAIL_TEMPLATES.md) untuk detail lengkap.

### Available Templates

- **OTP Email** - Untuk password reset
- **Verification Email** - Untuk account activation
- **Welcome Email** - Untuk new users
- **Password Changed Email** - Konfirmasi perubahan password
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

### Core Dependencies

- **bun** (v1.1.x) - Runtime & Package manager
- **express** (v5.1.0) - Web framework
- **typescript** (v5.9.3) - Type safety
- **@prisma/client** (v7.4.2) - Database ORM
- **zod** (v4.3.6) - Schema validation
- **bullmq** (v5.76.6) - Background jobs
- **ioredis** (v5.8.2) - Redis client
- **jsonwebtoken** (v9.0.2) - JWT authentication
- **bcrypt** (v6.0.0) - Password hashing

### Security

- **helmet** (v8.1.0) - Security headers
- **cors** (v2.8.5) - CORS handling

### File Handling

- **multer** (v2.0.2) - File upload (temporary handling)
- **@aws-sdk/client-s3** (v3.917.0) - S3 integration

### Utilities

- **pino** (v10.1.0) - Logging
- **nodemailer** (v7.0.10) - Email sending
- **dotenv** (v17.2.3) - Environment variables

### Development & Testing

- **jest** (v30.2.0) - Testing framework
- **bun test** - Native fast testing
- **eslint** (v9.39.1) - Linting
- **prettier** - Code formatting
- **supertest** - API testing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## � Documentation

- [CHANGELOG](./CHANGELOG.md) - Detailed version history and changes
- [Email Templates Guide](./docs/EMAIL_TEMPLATES.md) - Email template usage and examples

## �📄 License

This project is licensed under the ISC License.

## 👤 Author

Created by [Iswanto25](https://github.com/Iswanto25)

## 🔗 Links

- **Repository**: [github.com/Iswanto25/boilerplate-expressJs](https://github.com/Iswanto25/boilerplate-expressJs)
- **Issues**: [Report a bug or request a feature](https://github.com/Iswanto25/boilerplate-expressJs/issues)
- **Pull Requests**: [Contribute to the project](https://github.com/Iswanto25/boilerplate-expressJs/pulls)

---

**Happy Coding! 🚀**
