## [1.2.0] - 2025-11-15

### Added

- Optional third-party services support - aplikasi tetap berjalan tanpa Redis, S3/MinIO, atau SMTP
- Graceful degradation untuk semua external services
- Warning logs ketika third-party services tidak tersedia
- `.env.minimal` - contoh konfigurasi minimal tanpa third-party services
- `isRedisAvailable` flag untuk checking Redis availability
- `isS3Configured` flag untuk checking S3/MinIO availability
- `HttpStatus.SERVICE_UNAVAILABLE` (503) untuk service yang tidak tersedia
- Middleware `requireS3` untuk file routes yang memerlukan S3/MinIO
- Documentation tentang optional third-party services di README

### Changed

- **Redis**: Tidak lagi wajib, aplikasi akan berjalan dengan warning jika tidak dikonfigurasi
  - Rate limiting akan dilewati jika Redis tidak tersedia
  - Token storage akan dilewati jika Redis tidak tersedia
- **S3/MinIO**: Tidak lagi wajib, file upload routes akan return 503 jika tidak dikonfigurasi
  - Warning ditampilkan saat startup jika tidak dikonfigurasi
  - Semua fungsi S3 mengecek availability sebelum eksekusi
- **SMTP**: Tidak lagi wajib, email sending akan dilewati dengan warning jika tidak dikonfigurasi
- Updated README dengan informasi tentang optional services
- Improved error messages dengan emoji untuk better visibility
- Redis client menggunakan lazy connect untuk avoid crash on startup

### Fixed

- Aplikasi tidak akan crash jika environment variable third-party tidak lengkap
- Proper error handling untuk missing third-party configurations

## [1.1.0] - 2024-11-15

### Added

- Global error handling middleware for consistent error responses
- 404 Not Found handler for undefined routes
- Environment-based CORS configuration (ALLOWED_ORIGINS)
- File upload routes with proper REST API structure (/api/v1/files)
- ESLint configuration for code quality enforcement
- Comprehensive .env.example with all required variables
- .env.test for testing environment
- CONTRIBUTING.md with development guidelines
- API documentation in README
- Enhanced .gitignore for better file management

### Changed

- Improved health check endpoint with more useful information
- Renamed `.env example` to `.env.example` (proper naming)
- Updated README with comprehensive documentation
- Enhanced security with environment-based CORS
- Reorganized express.ts to remove hardcoded test routes

### Removed

- Hardcoded test routes from production code (moved to proper API routes)
- Test file names from example routes

### Security

- CORS now supports environment-based allowed origins
- Better separation of development and production configurations

## [1.0.1] - 2025-10-28

### Added

- Redis-based Rate Limiter (per user / per IP)
- Auto logging to DB + respons.error() integration
