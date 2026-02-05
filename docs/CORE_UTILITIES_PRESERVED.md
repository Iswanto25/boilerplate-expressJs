# Core Utilities Preserved in Cleanup

## 🔒 Files yang TIDAK Dihapus oleh Cleanup Script

Cleanup script telah diupdate untuk **TIDAK menghapus** core utilities berikut:

### 1. Multer Middleware (File Upload)

```
✅ src/middlewares/multerMiddleware.ts
```

- Reusable file upload middleware
- Digunakan untuk multipart/form-data
- Dapat digunakan untuk berbagai keperluan upload

### 2. Email System

```
✅ src/utils/mail.ts
✅ src/utils/smtp.ts
```

- Email template generator
- SMTP configuration
- Commonly used untuk notifications, password reset, dll

### 3. API Signature System

```
✅ src/utils/signature.ts
✅ scripts/generateApiKey.ts
```

- HMAC-SHA256 signature verification
- API key generator
- Essential untuk secure API endpoints

### 4. Redis Integration

```
✅ src/configs/redis.ts
✅ src/utils/rateLimiter.ts
✅ src/utils/tokenStore.ts
```

- Redis connection config
- Rate limiting middleware
- JWT token caching
- Optional, gracefully degrades jika tidak dikonfigurasi

## ❌ Yang AKAN Dihapus (Optional)

### Routes & Features

- `src/routes/fileRoutes.ts` - File upload routes (optional)
- `src/routes/exampleRoutes.ts` - Demo routes
- `src/features/example/` - Example feature folder

### Utilities (Optional)

- `src/utils/generateData.ts` - Test data generator
- `src/utils/bulkRegisterReport.ts` - Profiling reports
- `src/utils/getUsersReport.ts` - Get users reports

### Documentation (Only)

- `docs/EMAIL_TEMPLATES.md` - Email template docs (utils kept!)
- `docs/NIK_ENCRYPTION_PROFILING.md`
- `docs/AUTO_GENERATED_REPORTS.md`
- `docs/CPU_CONCURRENCY_GUIDE.md`
- `docs/09-profiling-bottleneck.md`

## 💡 Mengapa Core Utilities Tidak Dihapus?

1. **Commonly Used**: Features ini sering digunakan di production apps
2. **Graceful Degradation**: Tidak mengganggu jika tidak dikonfigurasi
3. **Easy to Disable**: Cukup jangan configure environment variables
4. **Hard to Re-implement**: Lebih mudah keep daripada re-code nanti
5. **No Performance Impact**: Tidak load jika tidak digunakan

## 🗑️ Cara Hapus Manual (Jika Benar-Benar Tidak Perlu)

Jika Anda **yakin tidak akan menggunakan** features ini:

### Hapus Multer

```bash
rm src/middlewares/multerMiddleware.ts
npm uninstall multer @types/multer
```

### Hapus Email System

```bash
rm src/utils/mail.ts
rm src/utils/smtp.ts
npm uninstall nodemailer
```

### Hapus API Signature

```bash
rm src/utils/signature.ts
rm scripts/generateApiKey.ts
# Update apiRoutes.ts dan app.ts untuk remove verifyApiKey middleware
```

### Hapus Redis Integration

```bash
rm src/configs/redis.ts
rm src/utils/rateLimiter.ts
rm src/utils/tokenStore.ts
npm uninstall ioredis
# Update app.ts untuk remove rateLimiter dan redis connection
```

## ⚠️ Warning Setelah Hapus Manual

Jika Anda hapus manual, **update imports** di:

1. `src/app.ts` - Remove middleware imports
2. `src/routes/apiRoutes.ts` - Remove verifyApiKey if signature removed
3. `src/features/auth/services/authServices.ts` - Remove tokenStore, mail utilities
4. `.env` - Remove unused environment variables

## ✅ Recommended Approach

**Keep all core utilities** dan hanya disable via environment config:

```env
# Don't configure if not needed - app will gracefully degrade

# Redis (optional)
# REDIS_HOST=localhost
# REDIS_PORT=6379

# SMTP (optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587

# S3/MinIO (optional)
# MINIO_ENDPOINT=localhost:9000

# API Signature (optional)
# USER_KEY=your-key
# SECRET_KEY=your-secret
```

App akan **tetap berjalan** meski services ini tidak dikonfigurasi!

---

**TL;DR**: Cleanup script sekarang **lebih safe** - hanya remove routes & documentation, keep core utilities untuk flexibility! 🚀
