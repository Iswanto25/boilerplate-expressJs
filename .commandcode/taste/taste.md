# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Architecture
- Worker bertindak sebagai trigger saja, tidak boleh berisi logika bisnis rumit. Logika bisnis ada di services atau utils. Confidence: 0.80
- Background jobs diorganisir per-feature di folder jobs/ dalam masing-masing feature (contoh: src/features/product/jobs/). Confidence: 0.80
- Alur standar: Controller → Queue → Worker terpicu → Worker panggil fungsi di services/utils. Confidence: 0.80
