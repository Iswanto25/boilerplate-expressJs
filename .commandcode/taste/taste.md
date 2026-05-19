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

# Security
- Jangan gunakan regex untuk parsing string (email, S3 endpoint, base64, dll). Gunakan loop for + indexOf untuk menghindari ReDoS. Confidence: 0.85
