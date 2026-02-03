# Bulk Register Endpoint

Endpoint untuk mendaftarkan banyak user sekaligus dalam satu request.

## 📝 Endpoint Details

**URL**: `/api/v1/auth/bulk-register`  
**Method**: `POST`  
**Auth Required**: No  
**Content-Type**: `application/json`

## 📥 Request Body

Kirim array of users dengan format yang sama seperti single register:

```json
[
	{
		"name": "John Doe",
		"email": "john.doe@example.com",
		"password": "SecurePassword123!",
		"address": "Jl. Sudirman No. 123, Jakarta",
		"phone": "081234567890",
		"photo": "data:image/jpeg;base64,..."
	},
	{
		"name": "Jane Smith",
		"email": "jane.smith@example.com",
		"password": "SecurePassword123!",
		"address": "Jl. Thamrin No. 456, Jakarta",
		"phone": "081298765432",
		"photo": "data:image/jpeg;base64,..."
	}
	// ... up to 1000 users
]
```

## 📤 Response

### Success Response (200 OK)

```json
{
	"status": 200,
	"message": "Bulk register selesai",
	"data": {
		"total": 1000,
		"success": 950,
		"failed": 50,
		"duration": "25346ms",
		"successRate": "95.00%",
		"errors": [
			{
				"email": "duplicate@example.com",
				"error": "Email already exists"
			},
			{
				"email": "invalid-email",
				"error": "Invalid email format"
			}
		],
		"successEmails": [
			"user1@example.com",
			"user2@example.com"
			// ... semua email yang berhasil
		]
	}
}
```

### Error Response (400 Bad Request)

**Data bukan array**:

```json
{
	"status": 400,
	"message": "Data harus berupa array",
	"error": null
}
```

**Array kosong**:

```json
{
	"status": 400,
	"message": "Array tidak boleh kosong",
	"error": null
}
```

**Data tidak lengkap**:

```json
{
	"status": 400,
	"message": "150 user memiliki data tidak lengkap",
	"error": null
}
```

## 🚀 Cara Menggunakan

### 1. Dengan Postman/Insomnia/Yaak

1. **Import data** dari `test_data.json`
2. **Set URL**: `POST http://localhost:4030/api/v1/auth/bulk-register`
3. **Headers**:
    ```
    Content-Type: application/json
    ```
4. **Body** (raw JSON):
    ```json
    [paste content dari test_data.json]
    ```
5. **Send**

### 2. Dengan cURL

```bash
curl -X POST http://localhost:4030/api/v1/auth/bulk-register \
  -H "Content-Type: application/json" \
  -d @test_data.json
```

### 3. Dengan Script

```javascript
const fs = require("fs");
const axios = require("axios");

async function bulkRegister() {
	const users = JSON.parse(fs.readFileSync("test_data.json", "utf-8"));

	try {
		const response = await axios.post("http://localhost:4030/api/v1/auth/bulk-register", users);

		console.log("✅ Bulk register berhasil!");
		console.log(`Total: ${response.data.data.total}`);
		console.log(`Success: ${response.data.data.success}`);
		console.log(`Failed: ${response.data.data.failed}`);
		console.log(`Success Rate: ${response.data.data.successRate}`);
		console.log(`Duration: ${response.data.data.duration}`);
	} catch (error) {
		console.error("❌ Error:", error.response?.data || error.message);
	}
}

bulkRegister();
```

## ⚡ Features

### 1. **Batch Processing**

- Memproses semua users satu per satu
- Tidak akan rollback jika ada yang gagal
- Setiap user diproses secara independent

### 2. **Error Handling**

- Skip user yang gagal dan lanjut ke yang berikutnya
- Collect semua error untuk reporting
- Return detail error untuk setiap user yang gagal

### 3. **Validation**

- ✅ Email format validation
- ✅ Email uniqueness check
- ✅ Required fields check
- ✅ Photo upload validation (skip if fails)

### 4. **Performance Tracking**

- Total processing time
- Success rate calculation
- Individual user timing

### 5. **Photo Upload**

- Automatic S3 upload untuk semua photos
- Continue without photo jika upload gagal
- Support base64 image format

## 📊 Performance

Dengan 1000 users:

- **Average time**: 20-30 seconds (tergantung network dan database)
- **Success rate**: ~95-99% (jika data valid)
- **Photo upload**: ~100ms per user

## ⚠️ Limitations

1. **Request Timeout**:
    - Default Express timeout: 2 minutes
    - Untuk 1000+ users, tingkatkan timeout:

    ```javascript
    // Dalam express config
    server.timeout = 300000; // 5 minutes
    ```

2. **Memory**:
    - Large payload (~5-10MB untuk 1000 users dengan photos)
    - Pastikan `express.json({ limit: "100mb" })` sudah diset

3. **Database Connections**:
    - Prisma connection pool harus cukup
    - Monitor database performance

## 🔧 Tips

### Untuk Data Besar (1000+ users)

1. **Split Data**:

    ```javascript
    // Split jadi batches of 100
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
    	const batch = users.slice(i, i + batchSize);
    	await axios.post("/bulk-register", batch);
    }
    ```

2. **Monitor Progress**:
    - Check response `success` dan `failed` count
    - Review `errors` array untuk debugging

3. **Cleanup Failed Users**:
    - Jika ada yang gagal, bisa retry hanya failed users
    - Filter dari `errors` array

## 🐛 Troubleshooting

**Request Timeout**:

```
Error: Request timeout of 120000ms exceeded
```

➜ Increase timeout atau split data into smaller batches

**Out of Memory**:

```
JavaScript heap out of memory
```

➜ Reduce batch size atau increase Node memory:

```bash
node --max-old-space-size=4096 index.js
```

**Too Many Connections**:

```
Error: too many connections
```

➜ Increase Prisma connection pool atau process in smaller batches

## 📈 Example Response

Untuk 1000 users:

```json
{
	"status": 200,
	"message": "Bulk register selesai",
	"data": {
		"total": 1000,
		"success": 987,
		"failed": 13,
		"duration": "24532ms",
		"successRate": "98.70%",
		"errors": [
			{
				"email": "existing@example.com",
				"error": "Email already exists"
			}
			// ... 12 more errors
		],
		"successEmails": [
			// ... 987 successful emails
		]
	}
}
```

---

**Happy Bulk Registering! 🚀**
