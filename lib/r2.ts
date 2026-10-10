/**
 * Cloudflare R2 client (S3-compatible via AWS SDK v3).
 *
 * Bucket is PRIVATE. Files are always served via short-lived presigned GET
 * URLs — never via R2_PUBLIC_URL directly. This ensures only authenticated
 * users can access uploaded documents.
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

let _r2Client: S3Client | null = null;

export function getR2Client() {
  if (!_r2Client) {
    _r2Client = new S3Client({
      region: 'auto',
      endpoint: requireEnv('R2_ENDPOINT'),
      credentials: {
        accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
      },
    });
  }
  return _r2Client;
}

const BUCKET = () => requireEnv('R2_BUCKET');

// Allowed MIME types for police reports / documents
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedDocumentMime = (typeof ALLOWED_DOCUMENT_TYPES)[number];

export function isAllowedDocumentType(mime: string): mime is AllowedDocumentMime {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mime);
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png'] as const;
export type AllowedPhotoMime = (typeof ALLOWED_PHOTO_TYPES)[number];
export const MAX_PHOTO_BYTES    = 2 * 1024 * 1024; // 2 MB
export const MAX_PHOTOS_PER_ITEM = 5;

export function isAllowedPhotoType(mime: string): mime is AllowedPhotoMime {
  return (ALLOWED_PHOTO_TYPES as readonly string[]).includes(mime);
}

/**
 * Generate a unique R2 key for a photo upload.
 * Format: photos/{itemId}/{uuid}.{ext}
 */
export function photoKey(itemId: number, mimeType: AllowedPhotoMime): string {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return `photos/${itemId}/${randomUUID()}.${ext}`;
}

/**
 * Generate a key for a photo uploaded before the item is saved (itemId not yet known).
 * Format: photos/tmp/{uuid}.{ext}
 */
export function photoKeyPending(mimeType: AllowedPhotoMime): string {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return `photos/tmp/${randomUUID()}.${ext}`;
}

/**
 * Generate a unique R2 key for a police report upload.
 * Format: police-reports/{itemId}/{uuid}.{ext}
 * UUID prevents enumeration; itemId gives logical grouping.
 */
export function policeReportKey(itemId: number, mimeType: AllowedDocumentMime): string {
  const ext = mimeType === 'application/pdf' ? 'pdf'
    : mimeType === 'image/png' ? 'png' : 'jpg';
  return `police-reports/${itemId}/${randomUUID()}.${ext}`;
}

/**
 * Presigned PUT URL — client uploads directly to R2.
 * Expires in 5 minutes (enough for upload, not lingering long).
 */
export async function presignPut(key: string, mimeType: string) {
  const client = getR2Client();
  // ContentType is signed to restrict upload to the correct MIME type.
  // ContentLength is intentionally NOT signed: per Cloudflare R2 and AWS docs (2026),
  // including it in signed headers causes silent 403s on some browsers because the
  // browser-set Content-Length may differ slightly from the value used at signing time.
  // Server-side size validation happens in the presign endpoint before issuing this URL.
  const command = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    ContentType: mimeType,
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

/**
 * Presigned GET URL — authenticated users view a private file.
 * Expires in 30 minutes.
 */
export async function presignGet(key: string): Promise<string> {
  const client = getR2Client();
  const command = new GetObjectCommand({ Bucket: BUCKET(), Key: key });
  return getSignedUrl(client, command, { expiresIn: 1800 });
}

/**
 * Delete an object from R2. Used if the DB write fails after a presigned
 * upload completes, to avoid orphaned files.
 */
export async function deleteObject(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}
