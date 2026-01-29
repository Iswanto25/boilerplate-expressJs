# Express.js & TypeScript Boilerplate

Boilerplate production-ready untuk membangun REST API menggunakan Express.js, TypeScript, dan Prisma. Arsitektur proyek ini dirancang agar modular, scalable, dan mudah dikelola.

## ✨ Fitur Utama

- **Framework**: Express.js v5 dengan TypeScript
- **ORM**: Prisma untuk database management yang modern dan type-safe
- **Authentication**: JWT-based authentication system
- **Security**:
    - Helmet untuk HTTP headers security
    - CORS dengan konfigurasi environment-based
    - Rate limiting dengan Redis (optional)
    - Data encryption utilities
    - Input validation
    - API Signature verification untuk endpoint protection
- **File Management**:
    - Upload file dengan Multer
    - Integrasi S3/MinIO (optional)
    - Support base64 upload
    - Automatic file cleanup
- **Error Handling**: Global error handler dan 404 handler
- **Logging**: Pino logger untuk structured logging dengan pretty print
- **Code Quality**:
    - ESLint untuk linting
    - Prettier untuk code formatting
    - Comprehensive test suite dengan Node.js test runner
- **Caching**: Redis integration untuk rate limiting dan token storage (optional)
- **Email**: SMTP integration untuk email sending (optional)
- **Graceful Degradation**: Aplikasi tetap berjalan meskipun layanan optional tidak dikonfigurasi

## 📂 Struktur Proyek

```
/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── scripts/
│   └── prepare-test-env.cjs # Test environment setup
├── src/
│   ├── app.ts              # Application entry point
│   ├── configs/            # Configuration modules
│   │   ├── db.ts           # Prisma database config
│   │   ├── express.ts      # Express app config
│   │   └── redis.ts        # Redis client config (optional)
│   ├── features/           # Feature-based modules
│   │   ├── auth/           # Authentication feature
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── validations/
│   │   └── services/       # Shared services
│   ├── middlewares/        # Custom middlewares
│   │   ├── authMiddleware.ts
│   │   ├── errorHandler.ts
│   │   └── multerMiddleware.ts
│   ├── routes/             # API route definitions
│   │   ├── apiRoutes.ts    # Main API routes
│   │   └── fileRoutes.ts   # File upload routes
│   └── utils/              # Utility functions
│       ├── __tests__/      # Unit tests
│       ├── encryption.ts   # Data encryption utilities
│       ├── jwt.ts          # JWT token utilities
│       ├── rateLimiter.ts  # Rate limiting middleware
│       ├── respons.ts      # Response formatting
│       ├── s3.ts           # S3/MinIO file storage
│       ├── smtp.ts         # Email sending
│       ├── tokenStore.ts   # Token caching with Redis
│       └── utils.ts        # General utilities
├── .env.example            # Environment variables template
├── .env.test               # Test environment variables
├── .eslintrc.json          # ESLint configuration
├── .prettierrc             # Prettier configuration
├── nodemon.json            # Nodemon configuration
├── package.json
├── tsconfig.json           # TypeScript configuration
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
- ✅ **Password Hashing** - bcrypt integration

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
curl -H "x-api-key: YOUR_GENERATED_API_KEY" http://localhost:3004/api/v1/example/protected

# Test public endpoint (tidak perlu API key)
curl http://localhost:3004/api/v1/example/public
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

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout

### File Upload (requires S3/MinIO)

- `POST /api/v1/files/upload` - Upload file (multipart/form-data)
- `POST /api/v1/files/upload-base64` - Upload base64 encoded file
- `GET /api/v1/files/:folder/:fileName` - Get presigned URL
- `DELETE /api/v1/files/:folder/:fileName` - Delete file

### API Signature Examples

- `GET /api/v1/example/protected` - Protected endpoint (requires x-api-key header)
- `GET /api/v1/example/public` - Public endpoint (no authentication required)

## 🛠️ Tech Stack

### Core Dependencies

- **express** (v5.1.0) - Web framework
- **typescript** (v5.9.3) - Type safety
- **@prisma/client** (v6.18.0) - Database ORM
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
- **nanoid** (v5.1.6) - Unique ID generation

### Development

- **nodemon** (v3.1.10) - Hot reload
- **eslint** (v9.39.1) - Linting
- **prettier** - Code formatting
- **ts-node** (v10.9.2) - TypeScript execution

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the ISC License.

## 👤 Author

Created by [Iswanto25](https://github.com/Iswanto25)

---

**Happy Coding! 🚀**
