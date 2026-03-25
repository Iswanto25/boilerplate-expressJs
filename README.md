# Express.js & TypeScript Boilerplate

Boilerplate production-ready untuk membangun REST API menggunakan Express.js, TypeScript, dan Prisma. Arsitektur proyek ini dirancang agar modular, scalable, dan mudah dikelola.

## ✨ Fitur Utama

- **Framework**: Express.js v5 dengan TypeScript
- **Architecture**: Modular Feature-based Architecture dengan Repository Pattern
- **ORM**: Prisma v7 untuk database management yang modern dan type-safe
- **Authentication**:
    - JWT-based authentication system
    - User registration with profile creation
    - Access & refresh token management (Multi-device support)
    - Token caching with Redis (optional)
    - Profile management with photo upload (Public URL access)
    - **NIK (National ID) encryption with AES-256-GCM**
- **Security**:
    - Helmet untuk HTTP headers security
    - CORS dengan konfigurasi environment-based
    - Rate limiting dengan Redis (optional)
    - Data encryption utilities untuk sensitive data
    - AES-256-GCM encryption untuk NIK field
    - Input validation
    - API Signature verification untuk endpoint protection (HMAC-SHA256)
    - Password hashing with bcrypt
- **File Management**:
    - Upload file dengan Multer
    - Integrasi S3/MinIO (optional)
    - Support base64 upload untuk images
    - Automatic file cleanup saat update
    - Public URL access for secure and fast file delivery
    - Photo size & format validation
- **Email System**:
    - SMTP integration (optional)
    - Dynamic email templates
    - OTP email untuk password reset
    - Verification email untuk account activation
    - Welcome email untuk new users
    - Password change confirmation email
    - Customizable email templates
- **Performance Monitoring**:
    - Performance profiling untuk get users operations
    - Auto-generated markdown performance reports
    - NIK encryption/decryption speed tracking
    - Console logging dengan detailed metrics
    - Bottleneck detection dengan recommendations
    - CPU & memory usage monitoring
    - Throughput analysis (users/second)
- **Error Handling**: Global error handler dan 404 handler
- **Logging**: Pino logger untuk structured logging dengan pretty print
- **Code Quality**:
    - ESLint untuk linting
    - Prettier untuk code formatting
    - Comprehensive test suite dengan Jest
- **Caching**: Redis integration untuk rate limiting dan token storage (optional)
- **Graceful Degradation**: Aplikasi tetap berjalan meskipun layanan optional tidak dikonfigurasi
- **Path Alias**: Import menggunakan alias `@/` untuk menggantikan relative path yang panjang

## 📂 Struktur Proyek

```
/
├── prisma/
│   ├── schema.prisma        # Database schema dengan relasi User-Profile 1-to-1
│   ├── prisma.config.ts     # Prisma v7 config (database URL, schema path)
│   └── migrations/          # Database migrations
├── scripts/
│   ├── prepare-test-env.cjs # Test environment setup
│   └── generateApiKey.ts    # API signature key generator
├── src/
│   ├── app.ts               # Application entry point
│   ├── configs/             # Configuration modules
│   │   ├── database.ts      # Prisma database config
│   │   ├── express.ts       # Express app config & route mounting
│   │   └── redis.ts         # Redis client config (optional)
│   ├── features/            # Feature-based modules
│   │   └── auth/            # Authentication feature
│   │       ├── controllers/ # Auth controllers
│   │       ├── repository/  # Database access layer
│   │       ├── services/    # Auth business logic
│   │       └── validations/ # Input validation schemas
│   ├── generated/           # Auto-generated files (Prisma Client output)
│   ├── middlewares/         # Custom middlewares
│   │   ├── authMiddleware.ts      # JWT authentication
│   │   ├── errorHandler.ts        # Global error handler
│   │   └── multerMiddleware.ts    # File upload handler
│   ├── routes/              # API route definitions
│   │   ├── authRoutes.ts    # Authentication routes
│   │   └── fileRoutes.ts    # File upload routes
│   └── utils/               # Utility functions
│       ├── encryption.ts    # Data encryption utilities (AES-256-GCM)
│       ├── getUsersReport.ts# Performance report generator
│       ├── jwt.ts           # JWT token utilities
│       ├── mail.ts          # Email template generator
│       ├── rateLimiter.ts   # Rate limiting middleware
│       ├── respons.ts       # Response formatting
│       ├── s3.ts            # S3/MinIO file storage
│       ├── signature.ts     # API signature verification
│       ├── smtp.ts          # Email sending
│       ├── tokenStore.ts    # Token caching with Redis
│       └── utils.ts         # General utilities
├── .env.example             # Environment variables template
├── .env.test                # Test environment variables
├── CHANGELOG.md             # Project changelog
├── package.json
├── prisma.config.ts         # Prisma v7 configuration file
├── tsconfig.json            # TypeScript configuration (dengan path alias @/)
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 atau lebih baru
- [NPM](https://www.npmjs.com/) atau [Yarn](https://yarnpkg.com/)
- Database yang didukung Prisma (PostgreSQL, MySQL, SQLite, dll)

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

    # S3/MinIO (Optional - for file uploads)
    MINIO_ENDPOINT=localhost:9000
    MINIO_BUCKET_NAME=your-bucket
    MINIO_ACCESS_KEY=your-access-key
    MINIO_SECRET_KEY=your-secret-key
    MINIO_USE_SSL=false
    MINIO_REGION=us-east-1

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

5. **Start development server:**

    ```bash
    npm run dev
    ```

    Server akan berjalan di `http://localhost:3000`

## 📜 Available Scripts

| Script                     | Description                                |
| -------------------------- | ------------------------------------------ |
| `npm run dev`              | Start development server dengan hot-reload |
| `npm run build`            | Compile TypeScript ke JavaScript           |
| `npm start`                | Run production server                      |
| `npm run start:migrate`    | Run migrations dan start server            |
| `npm test`                 | Run test suite                             |
| `npm run test:utils`       | Run utility tests                          |
| `npm run lint`             | Check linting errors                       |
| `npm run lint:fix`         | Fix linting errors                         |
| `npm run prettier`         | Format code dengan Prettier                |
| `npm run generate-api-key` | Generate API key dengan signature          |

## 🧪 Testing

Project ini dilengkapi dengan comprehensive test suite:

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:utils
```

Test coverage meliputi:

- Encryption utilities
- JWT token management
- Response formatting
- Rate limiting
- S3 file operations
- SMTP configuration
- Token storage

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

### S3/MinIO (Optional)

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

### File Upload (requires S3/MinIO)

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

- **express** (v5.1.0) - Web framework
- **typescript** (v5.9.3) - Type safety
- **@prisma/client** (v7.4.2) - Database ORM
- **jsonwebtoken** (v9.0.2) - JWT authentication
- **bcrypt** (v6.0.0) - Password hashing

### Security

- **helmet** (v8.1.0) - Security headers
- **cors** (v2.8.5) - CORS handling

### File Handling

- **multer** (v2.0.2) - File upload
- **@aws-sdk/client-s3** (v3.917.0) - S3 integration

### Utilities

- **pino** (v10.1.0) - Logging
- **ioredis** (v5.8.2) - Redis client
- **nodemailer** (v7.0.10) - Email sending
- **dotenv** (v17.2.3) - Environment variables

### Development

- **tsx** (v4.21.0) - TypeScript execution dengan hot-reload
- **jest** (v30.2.0) - Testing framework
- **eslint** (v9.39.1) - Linting
- **prettier** - Code formatting
- **tsc-alias** (v1.8.16) - Path alias resolver saat build

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
