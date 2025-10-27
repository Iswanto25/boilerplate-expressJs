import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import { randomString } from "./utils";

const s3 = new S3Client({
	region: process.env.MINIO_REGION!,
	endpoint: process.env.MINIO_ENDPOINT!,
	forcePathStyle: true,
	credentials: {
		accessKeyId: process.env.MINIO_ACCESS_KEY!,
		secretAccessKey: process.env.MINIO_SECRET_KEY!,
	},
});

export async function uploadFile(file: Express.Multer.File, folder: string) {
	const fileExtension = path.extname(file.originalname);
	const fileName = `${folder}/${randomString()}${fileExtension}`;
	const fileStream = fs.createReadStream(file.path);

	const params = {
		Bucket: process.env.MINIO_BUCKET_NAME!,
		Key: fileName,
		Body: fileStream,
		ContentType: file.mimetype,
	};

	await s3.send(new PutObjectCommand(params));
	fs.unlinkSync(file.path);

	const fileUrl = `${process.env.MINIO_ENDPOINT!.replace(/\/$/, "")}/${process.env.MINIO_BUCKET_NAME}/${fileName}`;
	return fileUrl;
}

export async function uploadBase64(file: string, folder: string, maxSizeInMB?: number, allowedFormats?: string[]) {
	if (typeof file !== "string") {
		throw new Error("Invalid file type, must be a string");
	}

	const base64Pattern = /^data:(.+);base64,([A-Za-z0-9+/=]+)$/;
	const plainBase64Pattern = /^[A-Za-z0-9+/=]+$/;

	let mimeType = "image/png";
	let base64Data = file;

	if (base64Pattern.test(file)) {
		const matches = file.match(base64Pattern);
		if (!matches || !matches[2]) throw new Error("Invalid base64 data");
		mimeType = matches[1];
		base64Data = matches[2];
	} else if (!plainBase64Pattern.test(file)) {
		throw new Error("Invalid base64 string format");
	}

	if (allowedFormats && allowedFormats.length > 0) {
		const isAllowed = allowedFormats.includes(mimeType);
		if (!isAllowed) {
			throw new Error(`File format not allowed: ${mimeType}`);
		}
	}

	const buffer = Buffer.from(base64Data, "base64");

	const maxSizeMB = maxSizeInMB ?? 10;
	const maxBytes = maxSizeMB * 1024 * 1024;

	if (buffer.length > maxBytes) {
		throw new Error(`File too large. Maximum ${maxSizeMB}MB allowed.`);
	}

	const ext = mimeType.split("/")[1] || "bin";
	const fileName = `${folder}/${randomString()}.${ext}`;

	const bucket = process.env.MINIO_BUCKET_NAME ?? process.env.MINIO_BUCKET;

	const params = {
		Bucket: bucket!,
		Key: fileName,
		Body: buffer,
		ContentType: mimeType,
	};

	await s3.send(new PutObjectCommand(params));

	const fileUrl = `${process.env.MINIO_ENDPOINT!.replace(/\/$/, "")}/${bucket}/${fileName}`;
	return fileUrl;
}

export async function getFile(folder: string, file: string, expired: number = 3600): Promise<string | null> {
	try {
		const fileName = `${folder}/${file}`;

		const command = new GetObjectCommand({
			Bucket: process.env.MINIO_BUCKET_NAME!,
			Key: fileName,
		});

		const fileUrl = await getSignedUrl(s3, command, { expiresIn: expired });
		return fileUrl;
	} catch (error: any) {
		if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
			console.warn(`⚠️ File tidak ditemukan di MinIO: ${folder}/${file}`);
			return null;
		}

		console.error("❌ Error getFile from MinIO:", error.message);
		return null;
	}
}
