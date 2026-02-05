# Boilerplate Cleanup Guide

Script ini membantu Anda membersihkan boilerplate Express.js TypeScript ketika memulai project baru.

## 🎯 Tujuan

Menghapus file-file yang spesifik untuk boilerplate dan tidak diperlukan untuk aplikasi production Anda, seperti:

- Dokumentasi boilerplate (NIK encryption, profiling guides, etc)
- Test data dan generated reports
- Example/demo routes
- Optional services yang tidak digunakan

## 🚀 Cara Menggunakan

### Quick Start

```bash
npm run cleanup
```

Script akan menanyakan konfirmasi untuk setiap kategori file yang akan dihapus.

## 📋 File yang Akan Dihapus

### 1. Dokumentasi Boilerplate (Otomatis)

File-file ini akan dihapus otomatis setelah konfirmasi awal:

- `docs/NIK_ENCRYPTION_PROFILING.md`
- `docs/AUTO_GENERATED_REPORTS.md`
- `docs/CPU_CONCURRENCY_GUIDE.md`
- `docs/09-profiling-bottleneck.md`
- `docs/NIK_README_SECTION.md`
- `ADD_NIK_SPEED_TO_REPORTS.md`
- `ADD_THIS_ERROR_LOGGING.ts`
- `docs/URGENT_FIX_BULK_REGISTER.md`

### 2. Test Data & Reports (Otomatis)

- `test_data.json` - Generated test data
- `logger/bulk-register-reports/` - Performance reports
- `logger/get-users-reports/` - Get users reports

### 3. Optional Routes & Services (Interaktif)

Script akan menanyakan satu per satu:

#### File Upload Routes

```
📁 Remove file upload routes? (y/N)
```

Menghapus:

- `src/routes/fileRoutes.ts`
- `src/middlewares/multerMiddleware.ts`

#### Example/Demo Routes

```
📝 Remove example/demo routes? (y/N)
```

Menghapus:

- `src/routes/exampleRoutes.ts`
- `src/features/example/` (folder)

#### Test Data Generator

```
🎲 Remove test data generator? (y/N)
```

Menghapus:

- `src/utils/generateData.ts`

#### Performance Profiling Utilities

```
📊 Remove performance profiling utilities? (y/N)
```

Menghapus:

- `src/utils/bulkRegisterReport.ts`
- `src/utils/getUsersReport.ts`

⚠️ **Note**: Anda perlu update `authServices.ts` untuk menghapus profiling code

#### Email Template System

```
📧 Remove email template system? (y/N)
```

Menghapus:

- `src/utils/mail.ts`
- `src/utils/smtp.ts`
- `docs/EMAIL_TEMPLATES.md`

⚠️ **Note**: Update `authServices.ts` untuk menghapus email-related code (forgotPassword, etc)

#### API Signature System

```
🔐 Remove API signature verification system? (y/N)
```

Menghapus:

- `src/utils/signature.ts`
- `scripts/generateApiKey.ts`

#### Redis Integration

```
🗄️  Remove Redis integration? (y/N)
```

Menghapus:

- `src/configs/redis.ts`
- `src/utils/rateLimiter.ts`
- `src/utils/tokenStore.ts`

⚠️ **Note**: Update middleware imports dan remove Redis dari `app.ts`

### 4. Reset CHANGELOG (Otomatis)

CHANGELOG.md akan direset dengan template baru untuk project Anda.

### 5. Reset Git History (Opsional)

```
🗑️  Remove Git history and start fresh? (y/N)
```

Jika "Yes": Menghapus `.git` folder dan membuat commit awal baru.

## ⚠️ Penting - Setelah Cleanup

Setelah menjalankan cleanup, Anda perlu:

### 1. Update Imports

Jika Anda menghapus services/routes tertentu, update import statements di:

- `src/routes/apiRoutes.ts` - Remove routes yang dihapus
- `src/app.ts` - Remove middleware dan configs yang dihapus
- `src/features/auth/services/authServices.ts` - Remove profiling/email code jika dihapus

#### Contoh Update apiRoutes.ts:

**Sebelum:**

```typescript
import authRoutes from "./authRoutes";
import fileRoutes from "./fileRoutes";
import exampleRoutes from "./exampleRoutes";

router.use("/auth", authRoutes);
router.use("/files", fileRoutes);
router.use("/example", exampleRoutes);
```

**Sesudah (jika file & example routes dihapus):**

```typescript
import authRoutes from "./authRoutes";

router.use("/auth", authRoutes);
```

#### Contoh Update app.ts:

**Sebelum:**

```typescript
import { redis } from "./configs/redis";
import { rateLimiter } from "./utils/rateLimiter";

app.use(rateLimiter);
```

**Sesudah (jika Redis dihapus):**

```typescript
// Redis removed - no rate limiting
```

### 2. Update package.json

```json
{
	"name": "your-project-name",
	"version": "0.1.0",
	"description": "Your project description",
	"author": "Your Name <your.email@example.com>",
	"repository": {
		"type": "git",
		"url": "https://github.com/yourusername/yourproject"
	}
}
```

### 3. Update README.md

Update README dengan informasi project Anda:

- Project name
- Description
- Features (hapus yang tidak digunakan)
- Installation instructions
- API endpoints (sesuai yang ada)
- Dependencies yang masih digunakan

### 4. Update .env

Remove environment variables untuk services yang dihapus:

```env
# Jika Redis dihapus, remove:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# ...

# Jika SMTP dihapus, remove:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# ...

# Jika S3 dihapus, remove:
# MINIO_ENDPOINT=localhost:9000
# ...
```

### 5. Clean Dependencies (Optional)

Remove unused npm packages:

```bash
# If you removed Redis:
npm uninstall ioredis

# If you removed SMTP:
npm uninstall nodemailer

# If you removed S3:
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# If you removed file uploads:
npm uninstall multer @types/multer

# If you removed test data generator:
npm uninstall @faker-js/faker
```

### 6. Database Migrations (Optional)

Jika Anda ingin start fresh dengan database schema:

```bash
# Remove all migrations
rm -rf prisma/migrations

# Update schema.prisma sesuai kebutuhan
nano prisma/schema.prisma

# Create new initial migration
npx prisma migrate dev --name init
```

## ✅ Checklist Post-Cleanup

- [ ] Update `src/routes/apiRoutes.ts` - remove deleted routes
- [ ] Update `src/app.ts` - remove deleted middleware/configs
- [ ] Update `src/features/auth/services/authServices.ts` - remove deleted features
- [ ] Update `package.json` - name, description, author, repository
- [ ] Update `README.md` - project information
- [ ] Update `.env` - remove unused variables
- [ ] Run `npm install` - clean install dependencies
- [ ] Run `npm run lint:fix` - fix linting errors
- [ ] Run `npm run build` - verify build works
- [ ] Run `npm test` - verify tests pass (if kept)
- [ ] Commit changes: `git add . && git commit -m "Clean up boilerplate"`

## 🔄 Rollback

Jika Anda ingin rollback changes:

```bash
# If git history not reset:
git checkout .

# If git history was reset:
# Sorry, no rollback possible - clone fresh boilerplate
```

## 📚 Recommended Approach

**For beginners**: Start dengan menjawab "N" (No) untuk semua pertanyaan optional. Hapus file secara manual nanti ketika sudah familiar dengan codebase.

**For experienced developers**: Jawab "Y" untuk services yang pasti tidak digunakan, lalu update imports manual.

## 🆘 Troubleshoot

### Error: "command not found: bash"

**Windows users**: Use Git Bash atau WSL untuk run script.

Alternative (Windows CMD/PowerShell):

```bash
# Run manual cleanup instead
```

### Import errors after cleanup

Check file yang di-import masih ada:

```bash
npm run lint
```

Fix imports di files yang error.

### Build errors

```bash
npm run build
```

Check TypeScript errors dan fix sesuai dengan services yang dihapus.

---

**Happy Coding! 🚀**

Boilerplate ini dirancang modular -- hapus apa yang tidak diperlukan, keep what you need!
