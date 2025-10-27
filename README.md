# Express.js & TypeScript Boilerplate

Ini adalah boilerplate yang kokoh dan siap produksi untuk membangun REST API menggunakan Express.js, TypeScript, dan Prisma. Arsitektur proyek ini dirancang agar modular, dapat diskalakan, dan mudah dikelola.

## ✨ Fitur

- **Framework**: Express.js
- **Bahasa**: TypeScript
- **ORM**: Prisma untuk interaksi database yang modern dan aman.
- **Autentikasi**: Implementasi JWT (JSON Web Token) siap pakai.
- **Penanganan File**: Unggah file dengan Multer, dengan contoh integrasi Amazon S3.
- **Struktur Proyek**: Desain berbasis fitur (Feature-Sliced Design) untuk modularitas.
- **Konfigurasi**: Manajemen variabel lingkungan dengan `dotenv`.
- **Linting & Formatting**: Dikonfigurasi dengan Prettier untuk kode yang konsisten.
- **Caching**: Siap diintegrasikan dengan Redis.

## 📂 Struktur Proyek

```
/
├── prisma/
│   ├── schema.prisma       # Skema database Prisma
│   └── migrations/         # File migrasi database
├── src/
│   ├── app.ts              # Entry point utama aplikasi
│   ├── configs/            # Konfigurasi (database, express, redis)
│   ├── features/           # Logika bisnis per fitur (misal: auth, users)
│   │   └── auth/
│   │       ├── controllers/  # Controller (menangani request & response)
│   │       └── services/     # Service (logika bisnis inti)
│   ├── middlewares/        # Middleware kustom (misal: upload file)
│   ├── routes/             # Definisi rute API
│   └── utils/              # Fungsi utilitas (JWT, response handler, dll.)
├── .env.example            # Contoh file environment variable
├── package.json
└── tsconfig.json
```

## 🚀 Memulai

### Prasyarat

- [Node.js](https://nodejs.org/en/) (v18 atau lebih baru direkomendasikan)
- [NPM](https://www.npmjs.com/) atau [Yarn](https://yarnpkg.com/)
- Database yang didukung oleh Prisma (misalnya: PostgreSQL, MySQL, SQLite)

### Instalasi

1.  **Clone repositori ini:**
    ```bash
    git clone git@github.com:Iswanto25/boilerplate-expressJs.git
    cd <NAMA_DIREKTORI>
    ```

2.  **Install dependensi:**
    ```bash
    npm install
    ```

3.  **Siapkan Environment Variables:**
    Salin file `.env.example` menjadi `.env` dan sesuaikan nilainya.
    ```bash
    cp .env.example .env
    ```
    File `.env` Anda akan terlihat seperti ini:
    ```env
    # Konfigurasi Server
    PORT=3000

    # URL Koneksi Database (dari Prisma)
    DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

    # Kunci Rahasia JWT
    JWT_SECRET="kunci_rahasia_anda"
    JWT_EXPIRES_IN="1d"

    # Konfigurasi AWS S3 (Opsional)
    AWS_ACCESS_KEY_ID=
    AWS_SECRET_ACCESS_KEY=
    AWS_S3_BUCKET_NAME=

    # Konfigurasi Redis (Opsional)
    REDIS_HOST=localhost
    REDIS_PORT=6379
    ```

4.  **Jalankan Migrasi Database:**
    Pastikan koneksi `DATABASE_URL` Anda sudah benar, lalu jalankan perintah Prisma untuk membuat tabel di database Anda.
    ```bash
    npx prisma migrate dev
    ```

### Menjalankan Aplikasi

- **Mode Pengembangan (dengan hot-reload):**
  ```bash
  npm run dev
  ```

- **Mode Produksi:**
  ```bash
  npm run build
  npm start
  ```

## 📜 Skrip yang Tersedia

Dalam file `package.json`, Anda akan menemukan beberapa skrip:

- `start`: Menjalankan aplikasi dari kode yang sudah di-build (di direktori `dist/`).
- `dev`: Menjalankan aplikasi dalam mode pengembangan menggunakan `ts-node-dev` untuk hot-reloading.
- `build`: Mengompilasi kode TypeScript menjadi JavaScript di direktori `dist/`.

## Lizensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).
