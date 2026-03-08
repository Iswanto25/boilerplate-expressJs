# Changelog

Semua perubahan penting pada project ini akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), dan project ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [2.0.0] - 2026-03-08

### ⚡ Breaking Changes

- **Prisma upgrade ke v7**: Upgrade `prisma`, `@prisma/client`, dan `@prisma/adapter-pg` dari v6 ke **v7.4.2**
  - `url` di `datasource` block pada `schema.prisma` tidak lagi didukung di Prisma v7 — konfigurasi koneksi database sepenuhnya dipindahkan ke `prisma.config.ts`
- **API route prefix diubah**: Semua endpoint tidak lagi menggunakan prefix `/v1`
  - `POST /api/v1/auth/*` → `POST /api/auth/*`
  - `POST /api/v1/files/*` → `POST /api/files/*`

### 🗑️ Removed

- **Bulk Register** fitur dihapus:
  - `POST /api/auth/bulk-register` endpoint dihapus dari `authRoutes.ts`
  - `authController.bulkRegister` dihapus dari `authControllers.ts`
  - `authServices.bulkRegister` dihapus dari `authServices.ts`
  - `authRepository.createUsersBatch` dan `authRepository.createProfilesBatch` dihapus dari `authRepository.ts`
  - Test case `bulkRegister` dihapus dari `authControllers.spec.ts` dan `authServices.spec.ts`
  - `src/utils/bulkRegisterReport.ts` tidak lagi digunakan

### ✨ Changed

- **Import path alias**: Semua import path diubah dari relative path (`../../../utils/...`) ke alias `@/` (`@/utils/...`) untuk keterbacaan dan konsistensi
  - Berlaku di `authControllers.ts`, `authServices.ts`, dan file lainnya
- **`schema.prisma`**: Field `url` dihapus dari blok `datasource db` (dipindahkan ke `prisma.config.ts` sesuai Prisma v7)
- **`src/generated/`**: Folder disiapkan untuk output custom Prisma Client

---

## [1.4.0] - 2026-03-07

### ✨ Added

- **Docker support**: Konfigurasi Docker dan Docker Compose untuk containerized deployment
  - `Dockerfile` dengan multi-stage build
  - `docker-compose.yml` dengan service database, Redis, dan aplikasi
  - Environment variable-based configuration untuk semua Docker services
  - Auto-run `prisma migrate deploy` saat container start
- **`prisma.config.ts`**: File konfigurasi Prisma terpusat (menggunakan Prisma Config API)
  - Mendukung pembacaan `DATABASE_URL` dari environment variable

### 🔧 Fixed

- **Docker Prisma connection**: Perbaikan error `Can't reach database server` di dalam container karena penggunaan `localhost` — diganti dengan hostname service dari `docker-compose.yml`

---

## [1.3.0] - 2026-03-06

### ✨ Added

- **NIK encryption**: Enkripsi field NIK dengan AES-256-GCM di `encryption.ts`
- **Bulk register** endpoint: `POST /api/v1/auth/bulk-register` untuk mendaftarkan banyak user sekaligus (array input, hingga 1000 user) dengan:
  - Concurrency control via `p-limit`
  - Batch database insert (250 per batch)
  - Auto photo upload ke S3/MinIO
  - Performance profiling & markdown report generation
- **Performance profiling utilities**:
  - `src/utils/bulkRegisterReport.ts` — generate laporan performa bulk register
  - `src/utils/getUsersReport.ts` — generate laporan performa get users
- **API Signature** (`signature.ts`): Verifikasi endpoint dengan HMAC-SHA256
- **`scripts/generateApiKey.ts`**: Generate API key untuk testing signature endpoint

### 🔧 Fixed

- Perbaikan TypeScript type error pada query parameter `status` di RBAC controllers

---

## [1.2.0] - 2026-03-05

### ✨ Added

- **Email template system** (`src/utils/mail.ts`): Template modular untuk berbagai jenis email
  - OTP Email untuk password reset
  - Verification Email untuk aktivasi akun
  - Welcome Email untuk pengguna baru
  - Password Changed Email
- **`docs/EMAIL_TEMPLATES.md`**: Dokumentasi penggunaan email template
- **Get Users** endpoint: `GET /api/v1/auth/users` mengembalikan semua user lengkap dengan data profil dan URL foto

### 🔧 Changed

- Password hashing diperbarui dengan double-layer bcrypt dan custom salt (`SALT_HASH`, `SALT_ROUNDS`)

---

## [1.1.0] - 2026-03-04

### ✨ Added

- **Redis integration** (`src/configs/redis.ts`): Opsional untuk rate limiting dan token caching
- **Rate limiting** (`src/utils/rateLimiter.ts`): Berbasis Redis, graceful fallback jika Redis tidak tersedia
- **Token store** (`src/utils/tokenStore.ts`): Menyimpan refresh token di Redis
- **S3/MinIO integration** (`src/utils/s3.ts`):
  - Upload file multipart dan base64
  - Presigned URL generation
  - Validasi format dan ukuran file
  - Auto-delete file lama saat update profil
- **SMTP integration** (`src/utils/smtp.ts`): Email sending dengan Nodemailer
- **Forgot password & OTP flow**: Reset password menggunakan OTP via email
- **Profile management**: Update dan delete profil user termasuk cleanup S3 files
- **Graceful degradation**: Aplikasi tetap berjalan meskipun layanan optional (Redis, S3, SMTP) tidak dikonfigurasi

---

## [1.0.0] - 2026-03-01

### 🎉 Initial Release

- **Express.js v5** dengan TypeScript
- **Prisma ORM** untuk database management
- **Authentication**:
  - Register dengan pembuatan profil
  - Login dengan JWT (access token + refresh token)
  - Logout
  - Refresh token
  - Get profile
- **JWT utilities** (`src/utils/jwt.ts`): Sign dan verify token
- **Encryption utilities** (`src/utils/encryption.ts`): AES-256-GCM untuk data sensitif
- **Response formatting** (`src/utils/respons.ts`): Format standar JSON response
- **Structured logging** dengan Pino dan pino-pretty
- **ESLint & Prettier**: Code quality tools
- **Helmet & CORS**: Security headers dan cross-origin request handling
- **Global error handler & 404 handler**
- **Test suite** dengan Node.js test runner dan Jest

---

[Unreleased]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Iswanto25/boilerplate-expressJs/releases/tag/v1.0.0
