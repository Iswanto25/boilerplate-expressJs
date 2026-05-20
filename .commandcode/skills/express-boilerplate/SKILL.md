---
name: express-boilerplate
description: Pola dan konvensi standar untuk boilerplate Express.js + TypeScript + BullMQ + Prisma. Gunakan skill ini untuk setiap task coding di project ini.
version: 1.0.0
---

## Struktur Feature

```
src/features/<nama>/
├── controllers/       # Controller: validasi input + panggil service + response
├── services/          # Service: logika bisnis, throw apiError
├── repositories/      # Repository: akses database via Prisma, transaction-aware
├── validations/       # Zod schema
├── types/             # Type inference dari Zod
├── <nama>.routes.ts   # Route definition
└── jobs/              # Background job (queue + worker + job logic)
```

## Import Rules

1. NPM packages di atas, `@/` alias di bawah
2. Selalu pakai `.js` extension meskipun file `.ts`
3. Named export dominan (hindari default export kecuali Prisma)

## Alur Data

```
Controller → Service → Repository
     ↓                     ↑
  Zod.safeParse()     Prisma transaction
     ↓
  respons.success() / respons.error()
```

## Error Handling

- Throw `new apiError(400, "message")` di service
- Catch di controller, translate Inggris → Indonesia
- Tidak pernah pakai try/catch di service

## Validation

- Selalu `.safeParse()` bukan `.parse()`
- Ambil error dari `validation.error.issues[0].message`

## Response Format

```ts
respons.success("Pesan sukses", data, HttpStatus.OK, res, req);
respons.error("Pesan error", "Detail", HttpStatus.BAD_REQUEST, res, req);
```

## Database

- Repository method selalu terima `tx: TxClient = prisma`
- Gunakan `authRepository.transaction()` untuk multi-table

## Queue / Worker

- Queue diorganisir per feature di `jobs/`
- Worker hanya trigger, panggil logic dari `jobs/<nama>.job.ts`
- Logic akses utils atau service, bukan raw logic di worker

## Code Style

- `const` all the way (no `let`)
- `async/await`, bukan `.then()`
- Object literal pattern: `export const authServices = {...}`
- UPPER_SNAKE_CASE untuk constants
- camelCase untuk fungsi dan variabel
- Jangan pakai regex untuk parsing string (ReDoS-safe)

## Logging

- Pino: `logger.info()`, `logger.error({ err }, "msg")`
- First arg selalu object untuk error
- Jangan log password atau token

## Testing

- Arrange-Act-Assert
- `__tests__/helpers/` untuk mock & faker
- Co-located spec: `*.spec.ts` di samping file source
- Jest untuk unit + integration, Bun:test untuk infrastructure
