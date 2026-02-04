# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **NIK (National ID) Field with AES-256-GCM Encryption**
    - Added `NIK` field to profile schema with encrypted storage
    - Automatic encryption during user registration (bulk and single)
    - Automatic decryption when retrieving user data
    - Encryption uses `DATA_ENCRYPTION_KEY` from environment (64-char hex, 32 bytes)
    - Supports 16-digit NIK format with secure storage

- **Performance Profiling System**
    - Comprehensive profiling for bulk register operations
        - Email validation timing tracking
        - Password hashing + photo upload + NIK encryption timing
        - Database insertion batch timing
        - Per-batch performance metrics
    - Comprehensive profiling for get users operations
        - Database query timing tracking
        - URL generation + NIK decryption timing
        - Per-user performance metrics
    - Console logging with detailed metrics:
        - Average time per operation
        - Success/failure counts
        - Memory usage tracking
        - CPU utilization metrics

- **Auto-Generated Markdown Performance Reports**
    - Bulk register reports (`logger/bulk-register-reports/`)
        - Execution time breakdown by phase
        - System resources (CPU cores, concurrency limit)
        - Batch processing details with success/failure status
        - Data size analysis (photo sizes)
        - **NIK encryption performance metrics**
            - Total encryption time
            - Average time per NIK (typically 0.1-0.5ms)
            - Encryption throughput (NIKs/second)
        - Bottleneck detection with automatic recommendations
        - Scalability projections
    - Get users reports (`logger/get-users-reports/`)
        - Database query performance
        - URL generation timing
        - **NIK decryption performance metrics**
            - Total decryption time
            - Average time per NIK (typically 0.1-0.4ms)
            - Decryption throughput (NIKs/second)
        - Throughput analysis
        - Memory usage statistics

- **Enhanced Bulk Register Endpoint**
    - Support for NIK field in bulk user registration
    - Parallel NIK encryption with profiling (pLimit concurrency control)
    - Detailed console output with phase-by-phase timing
    - Error logging for failed registrations with reasons
    - Automatic performance report generation after completion

- **Enhanced Get Users Endpoint**
    - NIK field included in user data response
    - Automatic NIK decryption with profiling
    - Performance metrics tracking for all operations
    - Automatic performance report generation

- **Performance Optimization Documentation**
    - `docs/09-profiling-bottleneck.md` - Profiling guide for identifying bottlenecks
    - `docs/NIK_ENCRYPTION_PROFILING.md` - NIK encryption/decryption implementation guide
    - `docs/AUTO_GENERATED_REPORTS.md` - Complete documentation for markdown reports
    - `docs/CPU_CONCURRENCY_GUIDE.md` - CPU and concurrency optimization guide

- **Test Data Generator Enhancement**
    - Added NIK field to generated test data
    - Generates realistic 16-digit NIK numbers
    - Updated `generateData.ts` utility

### Changed

- Updated `profile` model schema to include encrypted `NIK` field
- Enhanced `bulkRegister` service with NIK encryption and comprehensive profiling
- Enhanced `getUsers` service with NIK decryption and performance tracking
- Improved console logging with emoji indicators and detailed metrics
- Updated bulk register report interface to include NIK encryption metrics
- Updated get users report interface to include NIK decryption metrics
- Added `.gitignore` entries for auto-generated report directories

### Performance

- **NIK Encryption Speed**: ~0.19ms per NIK (average on 8-core CPU)
- **NIK Decryption Speed**: ~0.09ms per NIK (average on 8-core CPU)
- **Bulk Register Throughput**: ~80 users/second (with photos and NIK encryption)
- **Get Users Throughput**: ~18,000+ users/second (with NIK decryption)
- **Memory Efficiency**: Bulk register uses ~230-250MB for 1000 users
- **Concurrency**: Default 10 parallel processes (configurable via `CONCURRENCY_LIMIT`)

### Security

- NIK data encrypted at rest using AES-256-GCM
- Encryption keys must be 256-bit (32 bytes) in hex or base64 format
- Each encrypted NIK includes version number and authentication tag
- Secure key management via environment variables
- No plain-text NIK storage in database

### Documentation

- Dynamic email templates utility (`src/utils/mail.ts`)
    - Generic email template builder with customizable options
    - OTP email template for password reset
    - Verification email template for account activation
    - Welcome email template for new users
    - Password changed confirmation email
    - Generic OTP email for various purposes
- Comprehensive email template documentation (`docs/EMAIL_TEMPLATES.md`)
- User profile management with S3 integration
    - `updateProfile` service with photo upload/update
    - `deleteProfile` service with automatic S3 cleanup
    - Profile photo URL generation with presigned URLs
- New `GET /api/v1/auth/users` endpoint for fetching all users
    - Optimized photo URL generation using direct base URL construction
    - Returns user list with id, email, name, phone, address, and photo URL
    - Improved performance by avoiding individual `getFile` calls

### Changed

- Refactored `forgotPassword` method to use dynamic email templates
- Updated Prisma schema: User-Profile relationship changed from 1-to-many to proper 1-to-1
- Improved S3 file handling in auth services (register, login, profile)
- Enhanced profile data structure in authentication responses
- **Enhanced password hashing security:**
    - Added configurable salt hash via `SALT_HASH` environment variable
    - Added configurable salt rounds via `SALT_ROUNDS` environment variable (default: 5)
    - Password now hashed with format: `password-{SALT_HASH}` before bcrypt
    - Improved password comparison to match new hashing format

### Fixed

- Fixed async/await syntax error in `getUsers` method
    - Corrected method declaration from `async getUsers() =>` to `async getUsers()`
    - Resolved "'await' expressions are only allowed within async functions" error
    - Optimized implementation to avoid Promise.all overhead

## [2.0.0] - 2026-02-03

### Added

- User profile creation during registration with S3 photo upload support
- Base64 image upload support for profile photos
- Profile photo size validation (max 5MB)
- Image format validation (JPEG, PNG, WebP)
- Automatic file cleanup when updating profile photo
- 1-to-1 relationship between User and Profile models

### Changed

- Updated Prisma schema with proper User-Profile relationship
- Enhanced registration flow with profile photo upload
- Improved database schema with cascade delete for profiles

## [1.9.0] - 2026-02-03

### Added

- API signature hash body verification for enhanced security
- Request body hashing in signature generation
- Enhanced signature validation with payload integrity check

### Security

- Improved API signature mechanism to prevent request tampering

## [1.8.0] - 2026-01-29

### Added

- API Signature verification system for endpoint protection
- HMAC-SHA256 based signature generation and verification
- API key generator script (`npm run generate-api-key`)
- Protected and public endpoint examples
- Comprehensive API signature documentation in README
- `verifyApiKey` middleware for endpoint protection

### Security

- Time-based signature expiry (default: 5 minutes)
- User key and secret key based authentication
- Prevention of API abuse and unauthorized access

## [1.7.0] - 2026-01-20

### Changed

- Updated CODEOWNERS file to correctly assign @Iswanto25 as code owner
- Improved repository ownership configuration

## [1.6.0] - 2025-12-24

### Added

- Complete authentication system implementation
    - User registration
    - Login/Logout functionality
    - JWT token refresh mechanism
    - Profile management
- Enhanced database schema with user roles and authentication providers
- Refresh token management with database persistence

### Changed

- Updated database schema for authentication features
- Enhanced JWT utilities with access and refresh token generation
- Improved token storage and validation

### Documentation

- Translated README to English
- Added detailed environment variable configuration
- Documented authentication endpoints
- Added API endpoint examples

### Removed

- Unnecessary project documentation files
- Obsolete code comments from services and middleware

## [1.5.0] - 2025-11-24

### Changed

- Refactored S3 upload functions to return `fileName` and `folder` instead of public URL
- Improved S3 file handling with separate URL generation

### Fixed

- S3 file upload response format for better flexibility

## [1.4.0] - 2025-11-15

### Added

- Graceful degradation for optional services (Redis, S3/MinIO, SMTP)
- Application continues running even if optional services are not configured
- Service availability warnings in console

### Changed

- Made Redis optional (rate limiting and token caching)
- Made S3/MinIO optional (file upload features)
- Made SMTP optional (email sending features)
- Updated file permissions for configuration and middleware files

### Documentation

- Applied prettier formatting to all documentation files
- Improved code quality with enhanced security guidelines
- Better error handling documentation

## [1.3.0] - 2025-11-12

### Added

- Comprehensive test suite for utilities
    - Encryption utilities tests
    - JWT token management tests
    - Response formatting tests
    - Rate limiting tests
    - S3 file operations tests
    - SMTP configuration tests
    - Token storage tests

### Changed

- Applied prettier formatting to entire codebase
- Updated file permissions for multiple project files

### Fixed

- Async cleanup issue in S3 uploadFile test
- Package.json glob pattern for test files
- Three failing utility tests
- Test environment configuration

## [1.2.0] - 2025-10-29

### Added

- Data encryption utilities (`src/utils/encryption.ts`)
    - AES-256-GCM encryption for sensitive data
    - Key derivation with PBKDF2
    - Safe encryption/decryption wrappers
- Comprehensive encryption tests
- Hardened authentication profile utilities

### Security

- Sensitive data encryption at rest
- Secure key management
- Data integrity validation

## [1.1.0] - 2025-10-28

### Added

- Rate limiting with Redis integration
    - Configurable rate limits per endpoint
    - IP-based rate limiting
    - User-based rate limiting
- Redis token store for JWT management
    - Access token caching
    - Refresh token validation
    - Token invalidation on logout
- SMTP integration for email sending
    - Gmail SMTP support
    - Email templates for notifications
    - Password reset emails

### Changed

- Enhanced authentication services with token caching
- Improved response formatting utilities

### Fixed

- Response format consistency across endpoints
- Prisma configuration for better performance

## [1.0.0] - 2025-10-27

### Added

- Initial project setup
- Express.js v5 with TypeScript framework
- Prisma ORM integration
- Basic authentication endpoints
- JWT-based authentication
- Password hashing with bcrypt
- Helmet for security headers
- CORS configuration
- Multer for file uploads
- S3/MinIO integration for file storage
- Pino logger for structured logging
- ESLint and Prettier for code quality
- Environment-based configuration
- Database migrations with Prisma
- Health check endpoint
- Error handling middleware
- 404 handler

### Security

- Helmet integration for HTTP headers security
- CORS with environment-based origins
- Input validation
- Secure password hashing
- JWT token management

### Developer Experience

- Hot reload with nodemon
- TypeScript support
- Comprehensive .env.example
- Clear project structure
- NPM scripts for common tasks

---

## Legend

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements/fixes
- **Documentation**: Documentation changes

## Links

- [Repository](https://github.com/Iswanto25/boilerplate-expressJs)
- [Issues](https://github.com/Iswanto25/boilerplate-expressJs/issues)
- [Pull Requests](https://github.com/Iswanto25/boilerplate-expressJs/pulls)
