#!/bin/bash

# ==================================
# Boilerplate Cleanup Script
# ==================================
# Script ini menghapus file-file yang tidak diperlukan
# saat memulai project baru dengan boilerplate ini
#
# Usage: npm run cleanup
# ==================================

echo "🧹 Starting boilerplate cleanup..."
echo ""

# Confirmation
read -p "⚠️  This will remove boilerplate-specific files. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cleanup cancelled."
    exit 1
fi

echo ""
echo "📁 Removing boilerplate documentation files..."

# Remove boilerplate-specific documentation
rm -f docs/NIK_ENCRYPTION_PROFILING.md
rm -f docs/AUTO_GENERATED_REPORTS.md
rm -f docs/CPU_CONCURRENCY_GUIDE.md
rm -f docs/09-profiling-bottleneck.md
rm -f docs/NIK_README_SECTION.md
rm -f ADD_NIK_SPEED_TO_REPORTS.md
rm -f ADD_THIS_ERROR_LOGGING.ts
rm -f docs/URGENT_FIX_BULK_REGISTER.md

echo "✅ Documentation files removed"

echo ""
echo "📊 Removing generated test data and reports..."

# Remove test data
rm -f test_data.json

# Remove generated reports
rm -rf logger/bulk-register-reports
rm -rf logger/get-users-reports

# Remove example reports
rm -f logger/bulk-register-reports/EXAMPLE-bulk-register-report.md
rm -f logger/get-users-reports/EXAMPLE-get-users-report.md

echo "✅ Test data and reports removed"

echo ""
echo "🗄️  Cleaning up database migrations..."

# Optional: Remove all migrations (uncomment if you want to start fresh)
# read -p "🔄 Remove all database migrations? This will require you to create new migrations. (y/N): " -n 1 -r
# echo
# if [[ $REPLY =~ ^[Yy]$ ]]
# then
#     rm -rf prisma/migrations
#     echo "✅ Migrations removed"
# else
#     echo "⏭️  Migrations kept"
# fi

echo "⏭️  Migrations kept (remove manually if needed: 'rm -rf prisma/migrations')"

echo ""
echo "�️  Removing optional routes and services..."

# Remove file upload routes (if you don't need file uploads)
read -p "📁 Remove file upload routes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    rm -f src/routes/fileRoutes.ts
    rm -f src/middlewares/multerMiddleware.ts
    echo "✅ File upload routes removed"
else
    echo "⏭️  File routes kept"
fi

# Remove example routes (demonstration purposes only)
read -p "📝 Remove example/demo routes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    rm -rf src/routes/exampleRoutes.ts
    rm -rf src/features/example
    echo "✅ Example routes removed"
else
    echo "⏭️  Example routes kept"
fi

# Remove test data generator
read -p "🎲 Remove test data generator? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    rm -f src/utils/generateData.ts
    echo "✅ Test data generator removed"
else
    echo "⏭️  Test data generator kept"
fi

# Remove performance profiling utilities (if not needed)
read -p "📊 Remove performance profiling utilities? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    rm -f src/utils/bulkRegisterReport.ts
    rm -f src/utils/getUsersReport.ts
    echo "✅ Profiling utilities removed"
    echo "⚠️  Note: You'll need to update authServices.ts to remove profiling code"
else
    echo "⏭️  Profiling utilities kept"
fi

# Remove email templates (if you don't need email features)
read -p "📧 Remove email template system? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    rm -f src/utils/mail.ts
    rm -f src/utils/smtp.ts
    rm -f docs/EMAIL_TEMPLATES.md
    echo "✅ Email system removed"
    echo "⚠️  Note: Update authServices.ts to remove email-related code (forgotPassword, etc)"
else
    echo "⏭️  Email system kept"
fi

# Remove API signature system (if you don't need it)
read -p "🔐 Remove API signature verification system? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    rm -f src/utils/signature.ts
    rm -f scripts/generateApiKey.ts
    echo "✅ API signature system removed"
else
    echo "⏭️  API signature system kept"
fi

# Remove Redis integration (if you don't need caching/rate limiting)
read -p "🗄️  Remove Redis integration? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    rm -f src/configs/redis.ts
    rm -f src/utils/rateLimiter.ts
    rm -f src/utils/tokenStore.ts
    echo "✅ Redis integration removed"
    echo "⚠️  Note: Update middleware imports and remove Redis from app.ts"
else
    echo "⏭️  Redis integration kept"
fi

echo ""
echo "🔧 Cleaning up development helpers..."

# Remove API key generator (if not needed)
# Uncomment if you don't need API signature feature
# rm -f scripts/generateApiKey.ts

echo "⏭️  Check what was removed and update imports accordingly"

echo ""
echo "📜 Updating CHANGELOG..."

# Create new CHANGELOG for your project
cat > CHANGELOG.md << 'EOF'
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup based on Express.js TypeScript Boilerplate

---

## Links

- [Repository](https://github.com/YOUR_USERNAME/YOUR_PROJECT)
- [Issues](https://github.com/YOUR_USERNAME/YOUR_PROJECT/issues)
EOF

echo "✅ CHANGELOG.md reset"

echo ""
echo "📝 Updating README..."

# You can customize this part to update README
echo "⚠️  Please update README.md manually with your project information"

echo ""
echo "🔄 Resetting Git history (optional)..."

read -p "🗑️  Remove Git history and start fresh? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    rm -rf .git
    git init
    git add .
    git commit -m "Initial commit - Project setup based on Express.js TypeScript Boilerplate"
    echo "✅ Git history reset"
else
    echo "⏭️  Git history kept"
fi

echo ""
echo "✨ Cleanup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Update README.md with your project information"
echo "   2. Update package.json (name, description, author, repository)"
echo "   3. Configure .env file for your project"
echo "   4. Remove/modify features you don't need"
echo "   5. Run 'npx prisma migrate dev' to create your first migration"
echo ""
echo "🚀 Happy coding!"
