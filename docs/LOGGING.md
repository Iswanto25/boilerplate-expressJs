# Logging Configuration

## Overview

This boilerplate uses **Pino** for structured logging with a simplified, production-ready setup.

## Log Levels

- **Development**: Shows only essential information
- **Production**: Minimal logging with focus on errors

## What Gets Logged

### ✅ Simplified Console Output

**Success Requests**:

```
[10:25:30] INFO: ✅ POST /api/v1/auth/register 200 | John Doe
```

**Error Requests**:

```
[10:25:30] ERROR: ❌ POST /api/v1/auth/login 401 | Invalid credentials | Guest
```

**Database Issues**:

```
[10:25:30] ERROR: ❌ Database Error: Connection timeout
[10:25:30] WARN: ⚠️  Database Warning: Slow query detected
```

**Redis Status**:

```
[10:25:30] INFO: ✅ Redis connected
[10:25:30] INFO: ✅ Redis ready for commands
```

### 📁 Full Details Stored

While console shows simplified output, **full details** are always stored in:

1. **File logs** (`logger/YYYY-MM-DD.log`)
2. **Database** (`logs` table)

Full log includes:

- User ID, name, and role
- IP address
- Request host and path
- User agent
- Timestamp
- Complete request/response data

## Configuration Files

### 1. Prisma Database Logging (`src/configs/database.ts`)

```typescript
const prisma = new PrismaClient({
	log: [
		{ emit: "event", level: "error" },
		{ emit: "event", level: "warn" },
	],
});

// Only logs errors and warnings, not every query
prisma.$on("error", (e) => {
	logger.error(`❌ Database Error: ${e.message}`);
});

prisma.$on("warn", (e) => {
	logger.warn(`⚠️  Database Warning: ${e.message}`);
});
```

**What changed**:

- ❌ Removed verbose query logging
- ✅ Only log database errors and warnings
- ✅ Clean emoji indicators

### 2. Response Logging (`src/utils/respons.ts`)

```typescript
// Simplified console log
const path = req.path || req.originalUrl;
const userName = user?.name || "Guest";
logger.info(`✅ ${req.method} ${path} ${code} | ${userName}`);
```

**What changed**:

- ❌ Removed massive JSON object logging
- ✅ Simple one-line format
- ✅ Still saves full details to database

### 3. HTTP Request Logging (`src/configs/express.ts`)

```typescript
app.use(
	pinoHttp({
		logger,
		autoLogging: false, // Disabled to prevent duplicate logs
		quietReqLogger: true,
	}),
);
```

**What changed**:

- ❌ Disabled automatic HTTP logging (prevents duplicates)
- ✅ Custom logging in `respons.ts` is cleaner

## Log Output Comparison

### Before (Verbose) ❌

```
[04:25:30] INFO: QUERY: BEGIN | Params: [] | Duration: 0ms
[04:25:30] INFO: QUERY: SELECT "public"."user"."id", "public"."user"."role"::text...
[04:25:30] INFO: QUERY: INSERT INTO "public"."user" ("id","role","email"...
[04:25:30] INFO (Unknown):  {"ip":"127.0.0.1","date":"2026-02-03 11:25:30","host":"http://0.0.0.0:4030/api/v1/auth/register","status":"200","method":"POST","data":{"userAgent":"yaak","timestamp":"2026-02-03 11:25:30","source":"Success","message":"Berhasil register","data":{"user":{"id":"97ddbc94-2930-4319-9970-7742c6cc018f","name":"John Doe"...
[04:25:30] INFO: POST /register 200 - 252ms {"reqId":1,"responseTime":252}
```

### After (Clean) ✅

```
[04:25:30] INFO: ✅ POST /api/v1/auth/register 200 | John Doe
```

## Best Practices

1. **Console Logging**: Keep it minimal and readable
2. **File/Database Logging**: Store complete details for debugging
3. **Production**: Only log errors and critical events
4. **Development**: Show essential request flow

## Customization

### Change Log Format

Edit `src/utils/respons.ts`:

```typescript
// Current format: ✅ POST /api/v1/auth/register 200 | John Doe
logger.info(`✅ ${req.method} ${path} ${code} | ${userName}`);

// Add more info if needed:
logger.info(`✅ ${req.method} ${path} ${code} | ${userName} | ${responseTime}ms`);
```

### Enable Query Logging (Debug)

Edit `src/configs/database.ts`:

```typescript
const prisma = new PrismaClient({
	log: [
		{ emit: "event", level: "query" }, // Add this
		{ emit: "event", level: "error" },
		{ emit: "event", level: "warn" },
	],
});

prisma.$on("query", (e) => {
	logger.debug(`🔍 ${e.query}`); // Add this
});
```

## Environment Variables

No specific env vars required, but logging respects:

- `NODE_ENV=development` - More verbose
- `NODE_ENV=production` - Minimal logging

## Benefits

✅ **Clean Console** - Easy to read during development  
✅ **Complete Audit Trail** - Full details in database  
✅ **Performance** - Less I/O overhead  
✅ **Debugging** - File logs with complete context  
✅ **Production Ready** - Minimal noise, critical info only

## File Structure

```
logger/
├── 2026-02-03.log  # Daily rotation
└── 2026-02-04.log  # New file each day
```

Each log file contains full JSON for analysis:

```json
{
	"level": 30,
	"time": "2026-02-03T04:25:30.768Z",
	"msg": "✅ POST /api/v1/auth/register 200 | John Doe"
}
```

## Troubleshooting

**Too much logging?**

- Check `src/configs/database.ts` - ensure query logging is disabled
- Check `src/configs/express.ts` - ensure `autoLogging: false`

**Not enough logging?**

- Enable query logging in database config
- Set `NODE_ENV=development`
- Check log level in `src/utils/logger.ts`

---

**Result**: Clean, readable logs that don't overwhelm the console! 🎉
