# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Architecture

- Worker bertindak sebagai trigger saja, tidak boleh berisi logika bisnis rumit. Logika bisnis ada di services atau utils. Confidence: 0.80
- Background jobs diorganisir per-feature di folder jobs/ dalam masing-masing feature (contoh: src/features/product/jobs/). Confidence: 0.80
- Alur standar: Controller → Queue → Worker terpicu → Worker panggil fungsi di services/utils. Confidence: 0.80

# Logging

- Use pino logger (`logger`) instead of console.log/warn/info for all logging. Confidence: 0.65

# Workflow

- Ketika user mengajukan pertanyaan eksploratif (seperti "lebih baik X tidak?"), tanya/konfirmasi dulu sebelum implementasi — jangan langsung coding. Confidence: 0.80

# Controllers

- Destructure route params (e.g., `usersId`) menjadi variabel di awal controller sebelum digunakan. Confidence: 0.70
- Jika halaman menggunakan pagination, jabarkan/destructure parameter `req.query` (seperti `page`, `limit`) di awal controller. Confidence: 0.70
