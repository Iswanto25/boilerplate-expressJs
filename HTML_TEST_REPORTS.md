# 📊 HTML Test Reports - NestJS Style

Boilerplate ini sudah dilengkapi dengan **HTML Test Reports** yang cantik seperti NestJS! 🎨

## ✨ Fitur HTML Reports

### 1. **Test Dashboard** (test-dashboard.html)

Dashboard utama dengan:

- 📊 Test statistics (jumlah tests, pass/fail)
- 🔗 Quick links ke test reports
- ⚡ Command reference
- 🎨 Beautiful UI dengan gradients

### 2. **Detailed Test Report** (test-report/test-report.html)

Report detail dari jest-html-reporters:

- ✅ Test results per file
- 📝 Test descriptions
- ❌ Failure messages (jika ada)
- ⏱️ Execution time
- 📊 Test suite summary

### 3. **Coverage Report** (coverage/lcov-report/index.html)

Coverage report dari Jest:

- 📈 Line coverage percentage
- 📂 Coverage per file
- 🔍 Uncovered lines highlighted
- 📊 Visual coverage metrics

## 🚀 Cara Menggunakan

### Generate & View Reports

```bash
# Generate HTML reports (test + coverage)
npm run test:report

# Generate reports dan buka di browser (auto-open)
npm run test:report:open
```

### Struktur File HTML

Setelah run `npm run test:report`, struktur file:

```
project/
├── test-dashboard.html           ← 🏠 Main dashboard (buka ini!)
├── test-report/
│   └── test-report.html          ← 📋 Detailed test results
└── coverage/
    └── lcov-report/
        └── index.html             ← 📊 Coverage report
```

### Akses Reports

**1. Via Dashboard (Recommended)**

```bash
# Buka test-dashboard.html di browser
xdg-open test-dashboard.html  # Linux
open test-dashboard.html      # Mac
start test-dashboard.html     # Windows
```

Dari dashboard, klik:

- **Test Results** → Lihat detail test execution
- **Coverage Report** → Lihat code coverage
- **Testing Guide** → Baca dokumentasi

**2. Direct Access**

```bash
# Test report
xdg-open test-report/test-report.html

# Coverage report
xdg-open coverage/lcov-report/index.html
```

## 📋 NPM Scripts Tersedia

| Command                      | Description                    |
| ---------------------------- | ------------------------------ |
| `npm run test:jest`          | Run tests (terminal output)    |
| `npm run test:report`        | Generate HTML reports          |
| `npm run test:report:open`   | Generate & auto-open reports   |
| `npm run test:jest:watch`    | Watch mode                     |
| `npm run test:jest:coverage` | Coverage saja (no HTML report) |

## 🎯 Apa yang Tercakup dalam Reports

### Test Report Mencakup:

- ✅ Semua test suites (services, controllers, integration)
- ✅ Individual test cases dengan status (pass/fail)
- ✅ Error messages dan stack traces
- ✅ Execution time per test
- ✅ Console logs (jika ada)
- ✅ Summary statistics

### Coverage Report Mencakup:

- ✅ Line coverage
- ✅ Branch coverage
- ✅ Function coverage
- ✅ Statement coverage
- ✅ Per-file drill-down
- ✅ Uncovered lines visualization

## 📊 Sample Output

### Test Dashboard

![Test Dashboard](https://via.placeholder.com/800x400/667eea/ffffff?text=Beautiful+Test+Dashboard)

Features:

- 📊 Test statistics cards
- 🎨 Gradient backgrounds
- 🔗 Quick navigation
- ⚡ Command reference
- 📱 Responsive design

### Detailed Test Report

Menampilkan:

```
✅ Auth Services (12 tests)
  ✅ should register user successfully
  ✅ should throw error if email exists
  ✅ should login with valid credentials
  ...

✅ Auth Controllers (15 tests)
  ✅ should handle register request
  ✅ should validate required fields
  ...

Total: 37 tests | Pass: 37 | Fail: 0
```

### Coverage Report

Menampilkan:

```
📊 Overall Coverage
Lines      : 85% (170/200)
Statements : 85% (170/200)
Functions  : 80% (40/50)
Branches   : 75% (30/40)

📂 Files
✅ authServices.ts     - 92%
✅ authControllers.ts  - 88%
⚠️  userServices.ts    - 65%
```

## 🎨 Customization

### Jest HTML Reporter Config

Edit `jest.config.js` untuk customize:

```javascript
reporters: [
  'default',
  [
    'jest-html-reporters',
    {
      publicPath: './test-report',          // Output directory
      filename: 'test-report.html',         // Filename
      pageTitle: 'Your Custom Title',       // Page title
      expand: true,                         // Expand all suites
      openReport: false,                    // Auto-open browser
      includeConsoleLog: true,              // Include console logs
      includeFailureMsg: true,              // Include error messages
    },
  ],
],
```

### Dashboard Customization

Edit `test-dashboard.html` untuk:

- Change colors/gradients
- Update statistics
- Add custom sections
- Modify layout

## 🔍 Tips & Tricks

### 1. Continuous Reports

Jalankan watch mode sambil lihat reports:

```bash
# Terminal 1: Watch mode
npm run test:jest:watch

# Terminal 2: Serve reports (optional)
npx serve .
# Buka http://localhost:3000/test-dashboard.html
```

### 2. CI/CD Integration

Generate reports di CI/CD dan serve sebagai artifacts:

```yaml
# .github/workflows/test.yml
- name: Generate Test Reports
  run: npm run test:report

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
      name: test-reports
      path: |
          test-report/
          coverage/
          test-dashboard.html
```

### 3. Share Reports

Reports bisa di-share dengan:

- Upload ke static hosting (Netlify, Vercel)
- Serve via local server
- Zip dan kirim via email
- Commit ke repo (jika perlu)

## 📚 Documentation Links

- [Jest HTML Reporters](https://github.com/Hazyzh/jest-html-reporters)
- [Jest Coverage](https://jestjs.io/docs/configuration#collectcoveragefrom-array)
- [Testing Guide](../docs/TESTING.md)
- [Co-located Testing](../CO_LOCATED_TESTING.md)

## 🎉 Kesimpulan

Sekarang Anda punya:

- ✅ Beautiful HTML test dashboard
- ✅ Detailed test execution reports
- ✅ Interactive coverage reports
- ✅ Easy navigation between reports
- ✅ NestJS-style testing experience

**Happy Testing!** 🚀
