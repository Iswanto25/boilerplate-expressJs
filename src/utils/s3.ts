// utils/storage.ts
import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	HeadObjectCommand,
	DeleteObjectsCommand,
	ListObjectsV2Command,
	_Object,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { randomString } from "./utils";
dotenv.config({ quiet: process.env.NODE_ENV === "production" });


// ---- Env helpers ------------------------------------------------------------
function normalizeEndpoint(raw?: string, useSSL?: boolean): string | null {
	if (!raw || !raw.trim()) return null;
	let e = raw.trim().replace(/\/+$/, ""); // trim trailing slash
	if (!/^https?:\/\//i.test(e)) {
		// if user only put host:port, add scheme
		e = `${useSSL ? "https" : "http"}://${e}`;
	}
	return e;
}

// Check if S3/MinIO is configured
const USE_SSL = String(process.env.MINIO_USE_SSL || "").toLowerCase() === "true";
const ENDPOINT = normalizeEndpoint(process.env.MINIO_ENDPOINT, USE_SSL);
const REGION = process.env.MINIO_REGION?.trim() || "us-east-1";
const BUCKET = process.env.MINIO_BUCKET_NAME?.trim();
const ACCESS_KEY = process.env.MINIO_ACCESS_KEY?.trim();
const SECRET_KEY = process.env.MINIO_SECRET_KEY?.trim();

const isS3Configured = !!(ENDPOINT && BUCKET && ACCESS_KEY && SECRET_KEY);

let s3: S3Client | null = null;

if (isS3Configured) {
	try {
		s3 = new S3Client({
			region: REGION,
			endpoint: ENDPOINT!,
			forcePathStyle: true, // penting untuk MinIO
			credentials: { accessKeyId: ACCESS_KEY!, secretAccessKey: SECRET_KEY! },
			requestHandler: new NodeHttpHandler({
				connectionTimeout: 5_000,
				socketTimeout: 30_000,
			}),
		});
		console.info("✅ S3/MinIO configured successfully");
	} catch (error) {
		console.warn("⚠️  S3/MinIO initialization failed - file upload features will be disabled");
		s3 = null;
	}
} else {
	console.warn("⚠️  S3/MinIO not configured (MINIO_ENDPOINT, MINIO_BUCKET_NAME, MINIO_ACCESS_KEY, MINIO_SECRET_KEY) - file upload features will be disabled");
}

function publicUrl(key: string): string {
	return `${ENDPOINT}/${BUCKET}/${key}`; // cocok dengan console MinIO
}

function throwS3NotConfigured(): never {
	throw {
		name: "S3NotConfiguredError",
		code: "S3_NOT_CONFIGURED",
		httpStatus: 503,
		message: "S3/MinIO storage is not configured",
		hint: "Please configure MINIO_ENDPOINT, MINIO_BUCKET_NAME, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY in your environment variables",
	};
}

// ---- Head (cek exist) -------------------------------------------------------
export async function headFile(folder: string, file: string) {
	if (!s3) throwS3NotConfigured();

	const Key = `${folder}/${file}`;
	try {
		const res = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }));
		return {
			exists: true as const,
			etag: res.ETag,
			contentLength: res.ContentLength,
			contentType: res.ContentType,
			lastModified: res.LastModified,
		};
	} catch (err: any) {
		if (err?.$metadata?.httpStatusCode === 404) return { exists: false as const };
		throw err; // permission/network error: bubble up
	}
}

// ---- Upload (multer) --------------------------------------------------------
export async function uploadFile(file: Express.Multer.File, folder: string) {
	if (!s3) throwS3NotConfigured();

	const fileExtension = path.extname(file.originalname) || "";
	const key = `${folder}/${randomString()}${fileExtension}`;
	const stream = fs.createReadStream(file.path);

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: stream,
				ContentType: file.mimetype || "application/octet-stream",
				Metadata: { uploadedBy: "api" },
			}),
		);
		return publicUrl(key);
	} finally {
		// pastikan file temp dihapus
		try {
			fs.unlinkSync(file.path);
		} catch {}
	}
}

// ---- Upload (base64) --------------------------------------------------------
export async function uploadBase64(file: string, folder: string, maxSizeInMB: number = 10, allowedFormats?: string[]) {
	if (!s3) throwS3NotConfigured();

	// --- guard: tipe input
	if (typeof file !== "string") {
		throw {
			name: "UploadBase64Error",
			code: "INVALID_TYPE",
			httpStatus: 400,
			message: "Field 'file' harus berupa string base64 atau data URI.",
			hint: "Kirim 'file' sebagai data:image/jpeg;base64,... atau base64 murni.",
		};
	}

	const raw = file.trim();
	const dataUri = /^data:([^;]+);base64,([A-Za-z0-9+/=\s]+)$/i;

	let mimeType = "application/octet-stream";
	let base64Data = raw;

	// dukung data URI & plain base64 (termasuk whitespace/newline)
	const m = raw.match(dataUri);
	if (m) {
		mimeType = m[1].toLowerCase();
		base64Data = m[2];
	} else {
		// plain base64 → bersihkan whitespace lalu validasi
		const sanitized = raw.replace(/\s+/g, "");
		if (!/^[A-Za-z0-9+/=]+$/.test(sanitized)) {
			throw {
				name: "UploadBase64Error",
				code: "INVALID_BASE64",
				httpStatus: 400,
				message: "Format base64 tidak valid.",
				hint: "Pastikan string base64 tidak mengandung karakter di luar A–Z, a–z, 0–9, +, /, =.",
			};
		}
		base64Data = sanitized;
		// fallback mime jika tidak ada prefix data:
		mimeType = "image/jpeg";
	}

	// normalisasi jpg → jpeg
	if (mimeType === "image/jpg") mimeType = "image/jpeg";

	// validasi tipe file
	if (allowedFormats?.length && !allowedFormats.includes(mimeType)) {
		throw {
			name: "UploadBase64Error",
			code: "UNSUPPORTED_MEDIA_TYPE",
			httpStatus: 415,
			message: `Tipe file tidak diizinkan: ${mimeType}`,
			details: { allowed: allowedFormats },
			hint: `Gunakan salah satu: ${allowedFormats.join(", ")}`,
		};
	}

	// konstruksi buffer & validasi ukuran
	const buffer = Buffer.from(base64Data.replace(/\s+/g, ""), "base64");
	const maxBytes = maxSizeInMB * 1024 * 1024;
	if (buffer.length > maxBytes) {
		throw {
			name: "UploadBase64Error",
			code: "PAYLOAD_TOO_LARGE",
			httpStatus: 413,
			message: `Ukuran file terlalu besar. Maksimum ${maxSizeInMB}MB.`,
			details: { sizeBytes: buffer.length, maxBytes },
			hint: "Kompres gambar atau turunkan resolusi sebelum upload.",
		};
	}

	// tentukan ekstensi & key object
	const ext = (mimeType.split("/")[1] || "bin").toLowerCase();
	const key = `${folder}/${randomString()}.${ext}`;

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: buffer,
				ContentType: mimeType,
				Metadata: { uploadedBy: "api" },
			}),
		);
	} catch (e: any) {
		// bungkus error storage supaya jelas
		throw {
			name: "UploadBase64Error",
			code: "STORAGE_WRITE_FAILED",
			httpStatus: 502,
			message: "Gagal menyimpan objek ke storage.",
			details: { storage: "minio/s3", message: e?.message },
			hint: "Periksa koneksi ke MinIO, credential, permission bucket, dan endpoint.",
		};
	}

	// sukses → kembalikan URL publik sesuai helper kamu
	return publicUrl(key);
}

// ---- Presigned GET ----------------------------------------------------------
export async function getFile(
	folder: string,
	file: string,
	expired: number = 3600,
	opts?: {
		ensureExists?: boolean; // default true
		cacheControl?: string;
		contentDisposition?: "inline" | `attachment; filename="${string}"`;
		contentType?: string;
	},
): Promise<string | null> {
	if (!s3) {
		console.warn("⚠️  S3/MinIO not configured - cannot generate presigned URL");
		return null;
	}

	const ensureExists = opts?.ensureExists ?? true;
	const key = `${folder}/${file}`;

	try {
		if (ensureExists) {
			const head = await headFile(folder, file);
			if (!head.exists) return null; // <-- jangan presign kalau tidak ada
		}

		const command = new GetObjectCommand({
			Bucket: BUCKET!,
			Key: key,
			ResponseCacheControl: opts?.cacheControl ?? "public, max-age=31536000, immutable",
			ResponseContentDisposition: opts?.contentDisposition ?? "inline",
			...(opts?.contentType ? { ResponseContentType: opts.contentType } : {}),
		});

		return await getSignedUrl(s3, command, { expiresIn: expired });
	} catch (error: any) {
		console.error("❌ Error getFile from MinIO:", error?.message || error);
		return null;
	}
}

// ---- Delete (single, strict by default) -------------------------------------
export async function deleteFile(
	folder: string,
	file: string,
	opts?: { strict?: boolean; verifyAfter?: boolean },
): Promise<{ deleted: boolean; key: string; reason?: "not_found" | "still_exists" | "error" | "s3_not_configured" }> {
	if (!s3) {
		console.warn("⚠️  S3/MinIO not configured - cannot delete file");
		return { deleted: false, key: `${folder}/${file}`, reason: "s3_not_configured" };
	}

	const Key = `${folder}/${file}`;
	const strict = opts?.strict ?? true;
	const verifyAfter = opts?.verifyAfter ?? false;

	try {
		if (strict) {
			const pre = await headFile(folder, file);
			if (!pre.exists) return { deleted: false, key: Key, reason: "not_found" };
		}

		await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));

		if (verifyAfter) {
			const post = await headFile(folder, file);
			if (post.exists) return { deleted: false, key: Key, reason: "still_exists" };
		}

		return { deleted: true, key: Key };
	} catch (error: any) {
		console.error("❌ Error deleteFile from MinIO:", error?.message || error);
		return { deleted: false, key: Key, reason: "error" };
	}
}

// ---- Delete batch -----------------------------------------------------------
export async function deleteMany(items: Array<{ folder: string; file: string }>): Promise<{ deleted: string[]; errors: string[] }> {
	if (!s3) {
		console.warn("⚠️  S3/MinIO not configured - cannot delete files");
		return { deleted: [], errors: items.map((i) => `${i.folder}/${i.file}: S3 not configured`) };
	}

	if (!items.length) return { deleted: [], errors: [] };

	const toKey = (i: { folder: string; file: string }) => `${i.folder}/${i.file}`;

	// chunk 1000/permintaan sesuai S3
	const chunks: Array<Array<{ folder: string; file: string }>> = [];
	for (let i = 0; i < items.length; i += 1000) chunks.push(items.slice(i, i + 1000));

	const deleted: string[] = [];
	const errors: string[] = [];

	for (const chunk of chunks) {
		try {
			const res = await s3.send(
				new DeleteObjectsCommand({
					Bucket: BUCKET,
					Delete: { Objects: chunk.map((i) => ({ Key: toKey(i) })), Quiet: true },
				}),
			);
			res.Deleted?.forEach((d) => d.Key && deleted.push(d.Key));
			res.Errors?.forEach((e) => e.Key && errors.push(`${e.Key}: ${e.Code} ${e.Message || ""}`.trim()));
		} catch (err: any) {
			chunk.forEach((i) => errors.push(`${toKey(i)}: ${err?.message || "DeleteObjects failed"}`));
		}
	}
	return { deleted, errors };
}

// ---- Delete by prefix (paging) ----------------------------------------------
export async function deleteByPrefix(prefix: string): Promise<{ deleted: number; errors: number }> {
	if (!s3) {
		console.warn("⚠️  S3/MinIO not configured - cannot delete by prefix");
		return { deleted: 0, errors: 0 };
	}

	let continuationToken: string | undefined = undefined;
	let totalDeleted = 0;
	let totalErrors = 0;

	do {
		const listed = await s3.send(
			new ListObjectsV2Command({
				Bucket: BUCKET,
				Prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
				ContinuationToken: continuationToken,
				MaxKeys: 1000,
			}),
		);

		const objects = (listed.Contents || []) as _Object[];
		if (!objects.length) break;

		const res = await s3.send(
			new DeleteObjectsCommand({
				Bucket: BUCKET,
				Delete: { Objects: objects.map((o) => ({ Key: o.Key! })), Quiet: true },
			}),
		);

		totalDeleted += res.Deleted?.length || 0;
		totalErrors += res.Errors?.length || 0;

		continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
	} while (continuationToken);

	return { deleted: totalDeleted, errors: totalErrors };
}

export { s3, isS3Configured };
