import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	HeadObjectCommand,
	DeleteObjectsCommand,
	ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { randomString } from "./utils.js";
import { logger } from "./logger.js";
dotenv.config({ quiet: process.env.NODE_ENV === "production" });

function normalizeEndpoint(raw?: string, useSSL?: boolean, port?: string): string | null {
	if (!raw?.trim()) return null;
	// Remove trailing slashes without regex (avoids ReDoS)
	let e = raw.trim();
	while (e.endsWith("/")) e = e.slice(0, -1);
	// Check for protocol prefix without regex (avoids ReDoS)
	const lower = e.toLowerCase();
	if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
		e = `${useSSL ? "https" : "http"}://${e}`;
	}
	if (port) {
		try {
			const u = new URL(e);
			if (!u.port) {
				u.port = port;
				e = u.toString();
				while (e.endsWith("/")) e = e.slice(0, -1);
			}
		} catch {
			// ignore URL parsing errors
		}
	}
	return e;
}

const USE_SSL = String(process.env.MINIO_USE_SSL || "").toLowerCase() === "true";
const MINIO_PORT = process.env.MINIO_PORT?.trim();
const ENDPOINT = normalizeEndpoint(process.env.MINIO_ENDPOINT, USE_SSL, MINIO_PORT);
const REGION = process.env.MINIO_REGION?.trim() || "us-east-1";
const BUCKET = process.env.MINIO_BUCKET_NAME?.trim();
const ACCESS_KEY = process.env.MINIO_ACCESS_KEY?.trim();
const SECRET_KEY = process.env.MINIO_SECRET_KEY?.trim();

const isS3Configured = !!(ENDPOINT && BUCKET && ACCESS_KEY && SECRET_KEY);

const s3Holder: { client: S3Client | null } = { client: null };

if (isS3Configured) {
	try {
		s3Holder.client = new S3Client({
			region: REGION,
			endpoint: ENDPOINT,
			forcePathStyle: true,
			credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
		});
		console.info("S3/MinIO configured successfully");
	} catch {
		console.warn("S3/MinIO initialization failed - file upload features will be disabled");
		s3Holder.client = null;
	}
} else {
	console.warn(
		"S3/MinIO not configured (MINIO_ENDPOINT, MINIO_BUCKET_NAME, MINIO_ACCESS_KEY, MINIO_SECRET_KEY) - file upload features will be disabled",
	);
}

function publicUrl(key: string): string {
	return `${ENDPOINT}/${BUCKET}/${key}`;
}

export function getPublicUrl(folder: string, file: string): string {
	const publicBaseUrl = (process.env.STORAGE_PUBLIC_URL || "").replace(/^"|"$/g, "").replace(/\/$/, "");
	const bucket = (process.env.MINIO_BUCKET_NAME || "").trim();
	return `${publicBaseUrl}/${bucket}/${folder}/${file}`;
}

function throwS3NotConfigured(): never {
	throw Object.assign(new Error("S3/MinIO storage is not configured"), {
		name: "S3NotConfiguredError",
		code: "S3_NOT_CONFIGURED",
		httpStatus: 503,
		hint: "Please configure MINIO_ENDPOINT, MINIO_BUCKET_NAME, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY in your environment variables",
	});
}

export async function headFile(folder: string, file: string) {
	if (!s3Holder.client) throwS3NotConfigured();
	const s3 = s3Holder.client;

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
	} catch (err) {
		const error = err as { $metadata?: { httpStatusCode: number } };
		if (error?.$metadata?.httpStatusCode === 404) return { exists: false as const };
		throw err;
	}
}

export async function uploadFile(file: Express.Multer.File, folder: string) {
	if (!s3Holder.client) throwS3NotConfigured();
	const s3 = s3Holder.client;

	const fileExtension = path.extname(file.originalname) || "";
	const fileName = `${randomString()}${fileExtension}`;
	const key = `${folder}/${fileName}`;
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
		return { fileName, folder };
	} finally {
		try {
			fs.unlinkSync(file.path);
		} catch {
			// ignore unlink error
		}
	}
}

// ─── helpers for uploadBase64 (extracted to reduce cognitive complexity) ─────

/** Strip ASCII whitespace from a string without using regex (ReDoS-safe). */
function stripAsciiWhitespace(s: string): string {
	const chars: string[] = [];
	for (let i = 0; i < s.length; i++) {
		const cp = s.codePointAt(i) ?? -1;
		// space=32, tab=9, LF=10, CR=13
		if (cp !== 32 && cp !== 9 && cp !== 10 && cp !== 13) chars.push(s[i]);
	}
	return chars.join("");
}

/** Returns true when every character is a valid base64 character (ReDoS-safe). */
function isValidBase64String(s: string): boolean {
	for (let i = 0; i < s.length; i++) {
		const cp = s.codePointAt(i) ?? -1;
		const valid =
			(cp >= 65 && cp <= 90) || // A-Z
			(cp >= 97 && cp <= 122) || // a-z
			(cp >= 48 && cp <= 57) || // 0-9
			cp === 43 || // +
			cp === 47 || // /
			cp === 61; // =
		if (!valid) return false;
	}
	return true;
}

/** Parses raw input into { mimeType, base64Data }. Throws on invalid base64. */
function parseBase64Input(raw: string): { mimeType: string; base64Data: string } {
	const DATA_URI_PREFIX = "data:";
	const BASE64_MARKER = ";base64,";

	if (raw.startsWith(DATA_URI_PREFIX)) {
		const markerIdx = raw.indexOf(BASE64_MARKER);
		if (markerIdx !== -1) {
			return {
				mimeType: raw.slice(DATA_URI_PREFIX.length, markerIdx).toLowerCase(),
				base64Data: raw.slice(markerIdx + BASE64_MARKER.length),
			};
		}
		return { mimeType: "application/octet-stream", base64Data: raw };
	}

	const sanitized = stripAsciiWhitespace(raw);
	if (!isValidBase64String(sanitized)) {
		throw Object.assign(new Error("Format base64 tidak valid."), {
			name: "UploadBase64Error",
			code: "INVALID_BASE64",
			httpStatus: 400,
			hint: "Pastikan string base64 tidak mengandung karakter di luar A–Z, a–z, 0–9, +, /, =.",
		});
	}
	return { mimeType: "image/jpeg", base64Data: sanitized };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function uploadBase64(folder: string, file: string, maxSizeInMB: number = 10, allowedFormats?: string[]) {
	if (!s3Holder.client) throwS3NotConfigured();
	const s3 = s3Holder.client;

	if (typeof file !== "string") {
		throw Object.assign(new Error("Field 'file' harus berupa string base64 atau data URI."), {
			name: "UploadBase64Error",
			code: "INVALID_TYPE",
			httpStatus: 400,
			hint: "Kirim 'file' sebagai data:image/jpeg;base64,... atau base64 murni.",
		});
	}

	// 🔍 PROFILING: Start total time
	const totalStartTime = Date.now();
	const memStart = process.memoryUsage().heapUsed / 1024 / 1024;

	const parsed = parseBase64Input(file.trim());
	let mimeType = parsed.mimeType;
	const { base64Data } = parsed;

	if (mimeType === "image/jpg") mimeType = "image/jpeg";

	if (allowedFormats?.length && !allowedFormats.includes(mimeType)) {
		throw Object.assign(new Error(`Tipe file tidak diizinkan: ${mimeType}`), {
			name: "UploadBase64Error",
			code: "UNSUPPORTED_MEDIA_TYPE",
			httpStatus: 415,
			details: { allowed: allowedFormats },
			hint: `Gunakan salah satu: ${allowedFormats.join(", ")}`,
		});
	}

	// 🔍 PROFILING: Decode base64 (CPU bound)
	const decodeStart = Date.now();
	const buffer = Buffer.from(stripAsciiWhitespace(base64Data), "base64");
	const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
	const decodeTime = Date.now() - decodeStart;
	logger.info(`decode: ${decodeTime}ms`);
	logger.info(`File size: ${fileSizeMB} MB | Memory after decode: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);

	const maxBytes = maxSizeInMB * 1024 * 1024;
	if (buffer.length > maxBytes) {
		throw Object.assign(new Error(`Ukuran file terlalu besar. Maksimum ${maxSizeInMB}MB.`), {
			name: "UploadBase64Error",
			code: "PAYLOAD_TOO_LARGE",
			httpStatus: 413,
			details: { sizeBytes: buffer.length, maxBytes },
			hint: "Kompres gambar atau turunkan resolusi sebelum upload.",
		});
	}

	const ext = (mimeType.split("/")[1] || "bin").toLowerCase();
	const fileName = `${randomString()}.${ext}`;
	const key = `${folder}/${fileName}`;

	const uploadStart = Date.now();
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
		const uploadTime = Date.now() - uploadStart;
		logger.info(`upload: ${uploadTime}ms`);
	} catch (e) {
		const uploadTime = Date.now() - uploadStart;
		const totalTime = Date.now() - totalStartTime;
		logger.error(`Upload failed after ${totalTime}ms (upload stage: ${uploadTime}ms)`);
		throw Object.assign(new Error("Gagal menyimpan objek ke storage."), {
			name: "UploadBase64Error",
			code: "STORAGE_WRITE_FAILED",
			httpStatus: 502,
			details: { storage: "minio/s3", message: (e as Error)?.message },
			hint: "Periksa koneksi ke MinIO, credential, permission bucket, dan endpoint.",
		});
	}

	const totalTime = Date.now() - totalStartTime;
	const memEnd = process.memoryUsage().heapUsed / 1024 / 1024;
	logger.info(`Total upload time: ${totalTime}ms | Memory delta: ${(memEnd - memStart).toFixed(2)} MB`);

	return { fileName, folder, url: publicUrl(key) };
}

export async function getFile(
	folder: string,
	file: string,
	expired: number = 3600,
	opts?: {
		ensureExists?: boolean;
		cacheControl?: string;
		contentDisposition?: "inline" | `attachment; filename="${string}"`;
		contentType?: string;
	},
): Promise<string | null> {
	if (!s3Holder.client) {
		console.warn("S3/MinIO not configured - cannot generate presigned URL");
		return null;
	}
	const s3 = s3Holder.client;

	const ensureExists = opts?.ensureExists ?? true;
	const key = `${folder}/${file}`;

	try {
		if (ensureExists) {
			const head = await headFile(folder, file);
			if (!head.exists) return null;
		}

		const command = new GetObjectCommand({
			Bucket: BUCKET,
			Key: key,
			ResponseCacheControl: opts?.cacheControl ?? "public, max-age=31536000, immutable",
			ResponseContentDisposition: opts?.contentDisposition ?? "inline",
			...(opts?.contentType ? { ResponseContentType: opts.contentType } : {}),
		});

		return await getSignedUrl(s3, command, { expiresIn: expired });
	} catch (error) {
		logger.error({ err: error }, "Error getFile from MinIO");
		return null;
	}
}

export async function deleteFile(
	folder: string,
	file: string,
	opts?: { strict?: boolean; verifyAfter?: boolean },
): Promise<{ deleted: boolean; key: string; reason?: "not_found" | "still_exists" | "error" | "s3_not_configured" }> {
	if (!s3Holder.client) {
		console.warn("S3/MinIO not configured - cannot delete file");
		return { deleted: false, key: `${folder}/${file}`, reason: "s3_not_configured" };
	}
	const s3 = s3Holder.client;

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
	} catch (error) {
		logger.error({ err: error }, "Error deleteFile from MinIO");
		return { deleted: false, key: Key, reason: "error" };
	}
}

export async function deleteMany(items: Array<{ folder: string; file: string }>): Promise<{ deleted: string[]; errors: string[] }> {
	if (!s3Holder.client) {
		console.warn("S3/MinIO not configured - cannot delete files");
		return { deleted: [], errors: items.map((i) => `${i.folder}/${i.file}: S3 not configured`) };
	}
	const s3 = s3Holder.client;

	if (!items.length) return { deleted: [], errors: [] };

	const toKey = (i: { folder: string; file: string }) => `${i.folder}/${i.file}`;

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
		} catch (err) {
			chunk.forEach((i) => errors.push(`${toKey(i)}: ${(err as Error)?.message || "DeleteObjects failed"}`));
		}
	}
	return { deleted, errors };
}

export async function deleteByPrefix(prefix: string): Promise<{ deleted: number; errors: number }> {
	if (!s3Holder.client) {
		console.warn("S3/MinIO not configured - cannot delete by prefix");
		return { deleted: 0, errors: 0 };
	}
	const s3 = s3Holder.client;

	let continuationToken: string | undefined = undefined;
	let totalDeleted = 0;
	let totalErrors = 0;

	do {
		const listed: any = await s3.send(
			new ListObjectsV2Command({
				Bucket: BUCKET,
				Prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
				ContinuationToken: continuationToken,
				MaxKeys: 1000,
			}),
		);

		const objects = (listed.Contents as any[]) ?? [];
		if (!objects.length) break;

		const res = await s3.send(
			new DeleteObjectsCommand({
				Bucket: BUCKET,
				Delete: { Objects: objects.map((o: any) => ({ Key: o.Key ?? "" })).filter((o: any) => o.Key), Quiet: true },
			}),
		);

		totalDeleted += res.Deleted?.length || 0;
		totalErrors += res.Errors?.length || 0;

		continuationToken = listed.IsTruncated ? (listed.NextContinuationToken as string) : undefined;
	} while (continuationToken);

	return { deleted: totalDeleted, errors: totalErrors };
}

const s3 = s3Holder.client;
export { s3, isS3Configured };
