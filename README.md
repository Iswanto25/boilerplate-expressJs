# Express.js & TypeScript Boilerplate

Ini adalah boilerplate yang kokoh dan siap produksi untuk membangun REST API menggunakan Express.js, TypeScript, dan Prisma. Arsitektur proyek ini dirancang agar modular, dapat diskalakan, dan mudah dikelola.

## ✨ Fitur

- **Framework**: Express.js v5
- **Bahasa**: TypeScript
- **ORM**: Prisma untuk interaksi database yang modern dan aman
- **Autentikasi**: Implementasi JWT (JSON Web Token) siap pakai
- **Keamanan**:
    - Helmet untuk HTTP headers security
    - CORS dengan konfigurasi environment-based
    - Rate limiting dengan Redis (optional)
    - Data encryption utilities
- **Penanganan File**:
    - Upload file dengan Multer
    - Integrasi S3/MinIO (optional)
    - Support base64 upload
- **Error Handling**: Global error handler dan 404 handler
- **Logging**: Pino logger untuk structured logging
- **Struktur Proyek**: Feature-Sliced Design untuk modularitas
- **Konfigurasi**: Manajemen variabel lingkungan dengan `dotenv`
- **Code Quality**:
    - ESLint untuk linting
    - Prettier untuk formatting
    - Comprehensive test suite
- **Caching**: Redis integration untuk rate limiting dan token storage (optional)
- **Optional Third-Party Services**: Aplikasi tetap berjalan meskipun Redis, S3/MinIO, atau SMTP tidak dikonfigurasi

## 📂 Struktur Proyek

```
/
├── prisma/
│   ├── schema.prisma       # Skema database Prisma
│   └── migrations/         # File migrasi database
├── src/
│   ├── app.ts              # Entry point utama aplikasi
│   ├── configs/            # Konfigurasi (database, express, redis)
│   ├── features/           # Logika bisnis per fitur (misal: auth, users)
│   │   └── auth/
│   │       ├── controllers/  # Controller (menangani request & response)
│   │       └── services/     # Service (logika bisnis inti)
│   ├── middlewares/        # Middleware kustom (auth, upload file, error handler)
│   ├── routes/             # Definisi rute API
│   └── utils/              # Fungsi utilitas (JWT, response handler, dll.)
│       └── __tests__/      # Unit tests
├── .env.example            # Contoh file environment variable
├── .env.test               # Environment variables untuk testing
├── .eslintrc.json          # Konfigurasi ESLint
├── .prettierrc             # Konfigurasi Prettier
├── CONTRIBUTING.md         # Panduan kontribusi
├── package.json
└── tsconfig.json
```

## 🚀 Memulai

### Prasyarat

- [Node.js](https://nodejs.org/en/) (v18 atau lebih baru direkomendasikan)
- [NPM](https://www.npmjs.com/) atau [Yarn](https://yarnpkg.com/)
- Database yang didukung oleh Prisma (misalnya: PostgreSQL, MySQL, SQLite)

### Instalasi

1.  **Clone repositori ini:**

    ```bash
    git clone git@github.com:Iswanto25/boilerplate-expressJs.git
    cd <NAMA_DIREKTORI>
    ```

2.  **Install dependensi:**

    ```bash
    npm install
    ```

3.  **Siapkan Environment Variables:**

    Salin file `.env.example` menjadi `.env` dan sesuaikan nilainya:

    ```bash
    cp .env.example .env
    ```

    Pastikan Anda mengubah nilai-nilai berikut untuk produksi:
    - `DATABASE_URL`: Connection string database Anda (Required)
    - `DATA_ENCRYPTION_KEY`: Generate key 32 karakter hex untuk enkripsi (Required)
    - `JWT_SECRET` dan `JWT_REFRESH_SECRET`: Secret keys yang kuat (Required)
    - `ALLOWED_ORIGINS`: Daftar origin yang diizinkan (pisahkan dengan koma)
    
    **Optional Services** (aplikasi tetap berjalan tanpa konfigurasi ini):
    - **Redis**: Untuk rate limiting dan token storage. Jika tidak dikonfigurasi, rate limiting akan dilewati dan token tidak akan di-cache.
      - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
    - **S3/MinIO**: Untuk file upload. Jika tidak dikonfigurasi, file upload routes akan mengembalikan error 503.
      - `MINIO_ENDPOINT`, `MINIO_BUCKET_NAME`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
    - **SMTP**: Untuk email sending. Jika tidak dikonfigurasi, email akan dilewati dengan warning di log.
      - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

4.  **Jalankan Migrasi Database:**
    Pastikan koneksi `DATABASE_URL` Anda sudah benar, lalu jalankan perintah Prisma untuk membuat tabel di database Anda.
    ```bash
    npx prisma migrate dev
    ```

### Menjalankan Aplikasi

- **Mode Pengembangan (dengan hot-reload):**

    ```bash
    npm run dev
    ```

- **Mode Produksi:**
    ```bash
    npm run build
    npm start
    ```

## 📜 Skrip yang Tersedia

Dalam file `package.json`, Anda akan menemukan beberapa skrip:

- `dev`: Menjalankan aplikasi dalam mode pengembangan dengan nodemon untuk hot-reloading
- `build`: Mengompilasi kode TypeScript menjadi JavaScript di direktori `dist/`
- `start`: Menjalankan aplikasi dari kode yang sudah di-build (untuk produksi)
- `start:migrate`: Menjalankan database migration dan start aplikasi
- `test`: Menjalankan semua test suite
- `lint`: Check kode untuk linting errors
- `lint:fix`: Auto-fix linting errors
- `prettier`: Format semua kode dengan Prettier

## 🧪 Testing

Boilerplate ini dilengkapi dengan comprehensive test suite:

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:utils
```

## 🔒 Security Best Practices

- ✅ Helmet untuk HTTP security headers
- ✅ CORS dikonfigurasi dengan environment variables
- ✅ Rate limiting untuk mencegah abuse (dengan Redis, optional)
- ✅ Data encryption utilities
- ✅ JWT-based authentication
- ✅ Input validation
- ✅ Error handling yang aman (tidak expose stack trace di production)

## 🔌 Optional Third-Party Services

Aplikasi ini dirancang untuk tetap berjalan meskipun beberapa third-party services tidak dikonfigurasi. Berikut adalah behavior untuk setiap service:

### Redis (Optional)
- **Fungsi**: Rate limiting dan token storage
- **Jika tidak dikonfigurasi**: 
  - Rate limiting akan dilewati dengan warning log
  - Token storage akan dilewati dengan warning log
  - Aplikasi tetap berjalan normal
- **Environment Variables**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`

### S3/MinIO (Optional)
- **Fungsi**: File upload dan storage
- **Jika tidak dikonfigurasi**: 
  - File upload endpoints akan mengembalikan error 503 (Service Unavailable)
  - Warning ditampilkan saat aplikasi start
- **Environment Variables**: `MINIO_ENDPOINT`, `MINIO_BUCKET_NAME`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`

### SMTP (Optional)
- **Fungsi**: Email sending (forgot password, notifications, dll)
- **Jika tidak dikonfigurasi**: 
  - Email sending akan dilewati dengan warning log
  - Aplikasi tetap berjalan normal
- **Environment Variables**: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

**Catatan**: Hanya Database (Prisma) yang wajib dikonfigurasi. Semua third-party services lainnya bersifat optional.

## 🤝 Contributing

Silakan baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan kontribusi.

## 📝 API Documentation

### Health Check

```
GET /health
```

Response:

```json
{
	"status": "ok",
	"timestamp": "2024-11-15T10:30:00.000Z",
	"environment": "development"
}
```

### Authentication Routes

- `POST /api/v1/auth/register` - Register user baru
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### File Upload Routes

- `POST /api/v1/files/upload` - Upload file (multipart/form-data)
- `POST /api/v1/files/upload-base64` - Upload file base64
- `GET /api/v1/files/:folder/:fileName` - Get presigned URL
- `DELETE /api/v1/files/:folder/:fileName` - Delete file

## Lizensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).
