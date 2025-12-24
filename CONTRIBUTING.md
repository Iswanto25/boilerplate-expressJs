# Contributing to Express.js Boilerplate

Terima kasih atas minat Anda untuk berkontribusi pada proyek ini!

## Cara Berkontribusi

1. **Fork** repositori ini
2. **Clone** fork Anda ke mesin lokal
3. Buat **branch** baru untuk fitur atau perbaikan Anda
4. Buat perubahan Anda
5. **Test** perubahan Anda
6. **Commit** perubahan dengan pesan yang jelas
7. **Push** ke branch Anda
8. Buat **Pull Request**

## Panduan Pengembangan

### Setup Development Environment

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Setup database
npx prisma migrate dev

# Run in development mode
npm run dev
```

### Code Quality

#### Linting

Kami menggunakan ESLint untuk menjaga kualitas kode:

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

#### Formatting

Kami menggunakan Prettier untuk formatting kode:

```bash
# Format all files
npm run prettier
```

#### Testing

Selalu jalankan test sebelum membuat pull request:

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:utils
```

### Konvensi Kode

- Gunakan TypeScript untuk semua kode baru
- Ikuti konvensi penamaan yang ada di codebase
- Tambahkan komentar untuk logika yang kompleks
- Tulis test untuk fitur baru
- Update dokumentasi jika diperlukan

### Commit Messages

Gunakan format commit message yang jelas:

- `feat: menambahkan fitur baru`
- `fix: memperbaiki bug`
- `docs: update dokumentasi`
- `style: perubahan formatting`
- `refactor: refactoring kode`
- `test: menambahkan atau memperbaiki test`
- `chore: update dependencies atau konfigurasi`

### Pull Request Guidelines

- Pastikan semua test pass
- Update dokumentasi jika ada perubahan API
- Jelaskan perubahan yang Anda buat dengan jelas
- Link ke issue terkait jika ada
- Pastikan tidak ada conflict dengan branch main

## Struktur Proyek

```
src/
├── app.ts              # Entry point
├── configs/            # Konfigurasi (database, express, redis)
├── features/           # Fitur aplikasi (auth, users, dll)
│   └── auth/
│       ├── controllers/  # Request handlers
│       └── services/     # Business logic
├── middlewares/        # Custom middlewares
├── routes/             # Route definitions
└── utils/              # Utility functions
```

## Pertanyaan?

Jika Anda memiliki pertanyaan, silakan buat issue atau hubungi maintainer.

Terima kasih atas kontribusi Anda! 🎉
