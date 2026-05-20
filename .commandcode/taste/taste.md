# Architecture
- Worker bertindak sebagai trigger saja, tidak boleh berisi logika bisnis rumit. Logika bisnis ada di services atau utils. Confidence: 0.80
- Background jobs diorganisir per-feature di folder jobs/ dalam masing-masing feature (contoh: src/features/product/jobs/). Confidence: 0.80
- Alur standar: Controller → Queue → Worker terpicu → Worker panggil fungsi di services/utils. Confidence: 0.80

# Code Style
- Gunakan named export, bukan default export (kecuali untuk Prisma client). Confidence: 0.85
- Gunakan `.js` extension di import meskipun file source adalah `.ts`. Confidence: 0.85
- Gunakan object literal pattern untuk grouping function (contoh: export const authServices = {...}). Confidence: 0.85
- Gunakan const, bukan let. Confidence: 0.85

# Error Handling
- Throw apiError di service layer, catch + translate pesan error ke Bahasa Indonesia di controller. Confidence: 0.85

# Database
- Repository pattern transaction-aware: semua method wajib menerima parameter tx dengan default prisma agar bisa standalone atau dalam transaction. Confidence: 0.85

# Validation
- Gunakan Zod .safeParse() untuk validasi, jangan pernah gunakan .parse() yang throw. Confidence: 0.85

# Runtime
- Gunakan Bun sebagai runtime dan pilih alternatif Bun-native (seperti bun test, Bun.sql, Bun.file) dibanding library Node.js ketika tersedia. Confidence: 0.70

# Security
- Jangan gunakan regex untuk parsing string (email, S3 endpoint, base64, dll). Gunakan loop for + indexOf untuk menghindari ReDoS. Confidence: 0.85

# Testing
- Di bun:test, jangan mock module utility (seperti @/utils/utils.js) di file integration test karena mock.module bisa leak ke file test lain. Biarkan utility module pakai implementasi asli, cukup mock di level controller/service. Confidence: 0.70

# Dev Workflow
- Jalankan API server dan worker bersamaan dalam satu perintah `bun run dev`, bukan di terminal terpisah. Confidence: 0.70
