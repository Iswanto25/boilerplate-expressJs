# Optional Third-Party Services Guide

## Overview

Aplikasi ini dirancang dengan prinsip **graceful degradation** - artinya aplikasi tetap dapat berjalan meskipun beberapa third-party services tidak dikonfigurasi. Hanya **Database (PostgreSQL)** yang merupakan dependency wajib.

## Service Status

### ✅ Required Services
- **Database (PostgreSQL)**: Wajib untuk menyimpan data aplikasi
- **JWT Secrets**: Wajib untuk authentication
- **Encryption Key**: Wajib untuk data encryption

### ⚙️ Optional Services
- **Redis**: Untuk caching, rate limiting, dan token storage
- **S3/MinIO**: Untuk file upload dan storage
- **SMTP**: Untuk email notifications

## Behavior per Service

### 1. Redis (Optional)

**Environment Variables:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Jika TIDAK dikonfigurasi:**
- ⚠️ Warning log saat startup: `"Redis configuration not found - running without Redis"`
- Rate limiting akan dilewati dengan warning log
- Token storage (access & refresh tokens) akan dilewati
- Aplikasi tetap berjalan normal

**Jika DIKONFIGURASI tapi tidak bisa connect:**
- ⚠️ Warning log: `"Redis connection error - running without Redis"`
- Retry connection 3x, kemudian give up
- Fall back ke behavior "tidak dikonfigurasi"

**Impact:**
- ❌ Rate limiting tidak aktif (API bisa di-abuse)
- ❌ Token tidak di-cache di Redis (masih valid via JWT verification)
- ✅ Authentication tetap berfungsi
- ✅ Aplikasi tetap berjalan

### 2. S3/MinIO (Optional)

**Environment Variables:**
```env
MINIO_ENDPOINT=localhost:9000
MINIO_BUCKET_NAME=uploads
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_REGION=us-east-1
```

**Jika TIDAK dikonfigurasi:**
- ⚠️ Warning log saat startup: `"S3/MinIO not configured - file upload features will be disabled"`
- File upload endpoints return **503 Service Unavailable** dengan pesan:
  ```json
  {
    "status": 503,
    "message": "File storage not configured",
    "error": "S3/MinIO is not configured. Please set MINIO_ENDPOINT, ..."
  }
  ```

**Affected Endpoints:**
- `POST /api/v1/files/upload` → 503
- `POST /api/v1/files/upload-base64` → 503
- `GET /api/v1/files/:folder/:fileName` → 503
- `DELETE /api/v1/files/:folder/:fileName` → 503

**Impact:**
- ❌ File upload tidak bisa digunakan
- ✅ Semua endpoint lain tetap berfungsi
- ✅ Aplikasi tetap berjalan

### 3. SMTP (Optional)

**Environment Variables:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

**Jika TIDAK dikonfigurasi:**
- ⚠️ Warning log saat startup: `"SMTP not configured - email sending will be skipped"`
- Email sending di-skip dengan warning log:
  ```
  ⚠️ Email sending skipped (SMTP not configured) - 
     would have sent to: user@example.com with subject: "Password Reset"
  ```

**Jika DIKONFIGURASI tapi gagal kirim:**
- ⚠️ Warning log dengan error detail
- Tidak throw error, fungsi tetap return gracefully

**Impact:**
- ❌ Email tidak terkirim (forgot password, notifications, dll)
- ✅ Endpoint yang trigger email tetap return success
- ✅ Aplikasi tetap berjalan

## Minimal Configuration

Berikut adalah konfigurasi minimal untuk menjalankan aplikasi (tanpa Redis, S3, SMTP):

```bash
cp .env.minimal .env
# Edit .env dan sesuaikan DATABASE_URL
npm run dev
```

File `.env.minimal` berisi hanya environment variables yang wajib.

## Recommended Setup

### Development
```
✅ Database (PostgreSQL)
✅ JWT & Encryption keys
⚙️ Redis (recommended untuk testing rate limiting)
⚙️ MinIO (recommended untuk testing file upload)
❌ SMTP (optional, bisa skip dengan mock)
```

### Staging
```
✅ Database (PostgreSQL)
✅ JWT & Encryption keys
✅ Redis (recommended)
✅ S3/MinIO (recommended)
⚙️ SMTP (optional, tergantung requirement)
```

### Production
```
✅ Database (PostgreSQL)
✅ JWT & Encryption keys
✅ Redis (highly recommended)
✅ S3/MinIO (required jika ada fitur upload)
✅ SMTP (required jika ada fitur email)
```

## Monitoring

Saat aplikasi startup, perhatikan log untuk melihat service mana yang aktif:

```
✅ Redis connected
✅ S3/MinIO configured successfully
⚠️ SMTP not configured - email sending will be skipped
```

## Troubleshooting

### Redis tidak connect
1. Check apakah Redis service running: `redis-cli ping`
2. Check REDIS_HOST dan REDIS_PORT
3. Check firewall/network
4. Aplikasi akan tetap berjalan dengan warning

### S3/MinIO error
1. Check apakah MinIO service running
2. Check MINIO_ENDPOINT, credentials, dan bucket
3. Test dengan MinIO Console
4. File upload endpoints akan return 503

### SMTP error
1. Check SMTP credentials
2. Check SMTP_HOST dan SMTP_PORT
3. Check firewall/network
4. Email tidak terkirim tapi aplikasi tetap jalan

## Best Practices

1. **Always configure Database** - aplikasi tidak akan jalan tanpa DB
2. **Use Redis in production** - untuk rate limiting dan performance
3. **Configure S3 if needed** - sesuai requirement fitur upload
4. **SMTP optional** - tergantung apakah butuh email notification
5. **Monitor logs** - untuk melihat service mana yang tidak tersedia
6. **Graceful degradation** - aplikasi tetap usable meskipun ada service down

## Development Tips

- Gunakan `.env.minimal` untuk quick start tanpa setup semua services
- Setup Redis lokal dengan Docker: `docker run -d -p 6379:6379 redis`
- Setup MinIO lokal dengan Docker: `docker run -d -p 9000:9000 minio/minio server /data`
- Untuk testing SMTP, gunakan Mailtrap atau MailHog
