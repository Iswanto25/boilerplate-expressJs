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
