import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3-compatible) storage.
 *
 * Buckets:
 * - originals (private): untouched camera files, signed download only
 * - media (public):      cutout full-res + cutout web, served from R2_PUBLIC_BASE_URL
 */

export type R2Bucket = "originals" | "media";

const env = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var ${key}`);
  return value;
};

let client: S3Client | null = null;

function r2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function bucketName(bucket: R2Bucket): string {
  return bucket === "originals" ? env("R2_BUCKET_ORIGINALS") : env("R2_BUCKET_MEDIA");
}

export async function presignPut(bucket: R2Bucket, key: string, contentType: string, expiresIn = 600) {
  const command = new PutObjectCommand({
    Bucket: bucketName(bucket),
    Key: key,
    ContentType: contentType,
    CacheControl: bucket === "media" ? "public, max-age=31536000, immutable" : undefined,
  });
  return getSignedUrl(r2(), command, { expiresIn });
}

export async function presignGet(key: string, downloadName?: string, expiresIn = 900) {
  const command = new GetObjectCommand({
    Bucket: bucketName("originals"),
    Key: key,
    ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName}"` : undefined,
  });
  return getSignedUrl(r2(), command, { expiresIn });
}

export function publicUrl(key: string): string {
  return `${env("R2_PUBLIC_BASE_URL").replace(/\/$/, "")}/${key}`;
}

export async function putObject(bucket: R2Bucket, key: string, body: Uint8Array, contentType: string) {
  await r2().send(
    new PutObjectCommand({
      Bucket: bucketName(bucket),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: bucket === "media" ? "public, max-age=31536000, immutable" : undefined,
    }),
  );
}

export async function copyObject(bucket: R2Bucket, fromKey: string, toKey: string) {
  const name = bucketName(bucket);
  await r2().send(new CopyObjectCommand({ Bucket: name, CopySource: `${name}/${fromKey}`, Key: toKey }));
}

export async function deleteObjects(bucket: R2Bucket, keys: string[]) {
  if (keys.length === 0) return;
  await r2().send(
    new DeleteObjectsCommand({
      Bucket: bucketName(bucket),
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}
