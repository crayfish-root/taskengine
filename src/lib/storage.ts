import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** True once S3-compatible object storage credentials are set (Dokploy env vars). */
export function storageConfigured() {
  return !!(process.env.S3_BUCKET && process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

let cached: S3Client | null = null;
function client() {
  if (!cached) {
    cached = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return cached;
}

export function makeStorageKey(documentId: string, filename: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  return `documents/${documentId}/${safe}`;
}

export async function uploadToStorage(key: string, body: Buffer, contentType: string) {
  await client().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/** Short-lived presigned GET URL — kept to 60s so it's only usable right after we've already checked access. */
export async function getStorageDownloadUrl(key: string, filename: string) {
  const cmd = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    ResponseContentDisposition: `inline; filename="${encodeURIComponent(filename)}"`,
  });
  return getSignedUrl(client(), cmd, { expiresIn: 60 });
}

export async function deleteFromStorage(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
}

/**
 * Prepares a new document's content for storage: uploads to object storage when configured,
 * otherwise falls back to keeping the base64 data URL inline. Returns the id to create the
 * Document row with (generated up front so the storage key can reference it).
 */
export async function prepareDocumentStorage(mimeType: string, dataUrl: string, filename: string) {
  const id = randomUUID();
  if (storageConfigured()) {
    const commaIdx = dataUrl.indexOf(",");
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    const buffer = Buffer.from(base64, "base64");
    const key = makeStorageKey(id, filename);
    await uploadToStorage(key, buffer, mimeType);
    return { id, storageKey: key as string | null, dataUrl: null as string | null };
  }
  return { id, storageKey: null as string | null, dataUrl: dataUrl as string | null };
}
