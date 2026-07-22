# Changelog

Semua perubahan penting pada project ini akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), dan project ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0] - 2026-07-22

### ✨ Added

- **Zod Validation**: Implementasi Zod untuk validasi input di semua endpoint auth (register, login, refresh token, forgot password, dll).
- **RBAC System**: Dynamic Role-Based Access Control dengan model role, module, permission, dan `requirePermission` middleware.
- **OTP Flow**: OTP generation & verification dengan background email job, OTP purpose validation, dan expiry 5 menit.
- **Password Reset**: Flow reset password menggunakan time-limited token di Redis (900s) + email notification via BullMQ.
- **Profile Management**: Update profile (name, phone, address, NIK), delete profile dengan cascade cleanup S3.
- **Photo Upload**: Upload profile photo via Multer (disk) + base64, diproses asinkron via BullMQ queue.
- **S3 Presigned URL**: Upload flow baru via presigned URL dengan dedicated `/api/upload` feature module.
- **`validateOrThrow` Utility**: Fungsi validasi Zod di `respons.ts`, menggunakan `safeParse()` secara konsisten.
- **BullMQ Worker Observability**: Event listener `active`, `completed`, `failed`, `error` dengan detail attempt, duration, retry status.
- **SMTP Singleton Transport**: Transporter Nodemailer singleton, tidak lagi membuat koneksi baru setiap kirim email.
- **Worker Error Propagation**: Error `sendEmail` di-rethrow agar BullMQ dapat retry otomatis (3x exponential backoff).
- **Database Seeding**: Seeder untuk data awal (role, module, permission, admin user).
- **AGENTS.md**: Dokumentasi arsitektur project, pattern coding, dan development rules.
- **Graceful Shutdown**: SIGTERM/SIGINT handler untuk clean shutdown HTTP server + worker.
- **Database Indexes**: Index pada tabel `logs` (date, userId, reqId) dan tabel terkait.

### 🔄 Changed

- **Auth Module Architecture**: Modernisasi struktur — file dipisah ke controllers/services/repositories/types/validations, menggunakan import alias `@/`.
- **Controllers Refactor**: Semua `try-catch` dihapus dari controllers, validasi manual diganti `validateOrThrow()`. Error handling via global handler.
- **Controller Input Handling**:
  - `req.params` di-destructure langsung di awal controller (`const { id } = req.params`)
  - `req.query` untuk pagination di-destructure via `validateOrThrow` dengan Zod `z.coerce.number()`
- **Error Handler**: Global error handler menerjemahkan pesan error Inggris ke Bahasa Indonesia secara otomatis.
- **Auth Security**: Refresh token tidak lagi disimpan di database — hanya di Redis. Validasi token menggunakan `getStoredToken` sebelum regenerasi.
- **NIK Encryption**: Peningkatan enkripsi NIK dengan AES-256-GCM + dukungan prefix opsional `encry-` di `DATA_ENCRYPTION_KEY`.
- **Logger**: Implementasi Pino multistream (console + file harian di `logger/`), base64 truncation, sensitive field masking.
- **Audit Log**: Restruktur — log disimpan ke tabel `logs` via queue-based buffer (1000 entry, batch 10).
- **SMTP & Console**: Semua `console.warn`/`console.info` di `smtp.ts` diganti pino logger.
- **BullMQ Config**: `maxRetriesPerRequest: null` → `20`, cegah worker hang saat Redis unavailable.
- **S3 Environment**: Variabel environment di-rename dari `MINIO_*` ke `S3_*` untuk konsistensi.
- **AGENTS.md**: Controller pattern dan aturan destructuring params/query diperbarui sesuai kode aktual.
- **Response Format**: Field `status` dihapus dari body respons (status tetap di HTTP header).

### 🔧 Fixed

- **Forgot Password Silent Fail**: Jika Redis tidak tersedia, `forgotPassword` throw `503` (sebelumnya silent return).
- **SMTP Error Ditelan**: Error kirim email di-rethrow agar BullMQ bisa retry (sebelumnya error ditelan, job dianggap sukses).
- **Secure `/users` Route**: Endpoint `GET /api/auth/users` kini dilindungi `verifyToken` middleware.
- **ESM Import Paths**: Perbaikan ESM module resolution dan loader hooks untuk test compatibility.

### 🗑️ Removed

- **Multer Middleware**: Dihapus dari auth routes (digantikan BullMQ queue + base64 processing).
- **Database Refresh Token Storage**: Refresh token sepenuhnya dikelola di Redis.
- **Unused Scripts**: `cleanup-boilerplate.sh`, `test:unit`, `test:infra` dari `package.json`.
- **Unused Dependencies**: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `pino-http`.
- **`@types/pg`**: Dipindahkan dari `dependencies` ke `devDependencies`.

## [2.1.0] - 2026-03-24

### ✨ Added

- **Multi-device Support**: Perbaikan manajemen refresh token yang memungkinkan user login di banyak perangkat sekaligus.
- **Native Concurrency**: Implementasi `pLimit` secara native di `utils.ts` untuk menggantikan dependency `p-limit`.

### 🔄 Changed

- **Storage Refactor**: Semua operasi "get" file kini menggunakan URL publik langsung (`urlStorage`) melalui fungsi utilitas `getPublicUrl` di `s3.ts`.
- **Response Standardization**: Field `status` dihapus dari body respons sukses untuk menyederhanakan data (status tetap ada di HTTP header).
- **NIK Encryption**: Peningkatan penanganan enkripsi NIK menggunakan AES-256-GCM.
- **Service Refactor**: Memindahkan semua logika query Prisma dari `authServices.ts` ke `authRepository.ts` untuk meningkatkan separasi perhatian (separation of concerns).
- **ID Generation**: Menggunakan `crypto.randomUUID()` secara eksplisit di backend untuk pembuatan ID yang konsisten dan aman, tanpa mengandalkan default database.
- **Dependency Cleanup**: Menghapus library yang tidak digunakan lagi seperti `uuid`, `nanoid`, dan `@aws-sdk/node-http-handler` untuk mengoptimalkan ukuran proyek dan performa.

### 🔧 Fixed

- **Base64 Upload**: Perbaikan validasi dan penanganan error pada upload file dalam format base64.

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
    - Auto photo upload ke S3 Storage
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
- **S3 Storage integration** (`src/utils/s3.ts`):
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

[2.2.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Iswanto25/boilerplate-expressJs/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Iswanto25/boilerplate-expressJs/releases/tag/v1.0.0
