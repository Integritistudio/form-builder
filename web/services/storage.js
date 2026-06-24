import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

let client;
let bucketName;

function parseR2Config() {
  const rawEndpoint =
    process.env.R2_ENDPOINT ||
    process.env.CLOUDFLARE_S3_API ||
    process.env.S3_API_KEY;

  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID ||
    process.env.S3_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID;

  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.S3_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY;

  let endpoint = rawEndpoint || "";
  let bucket = process.env.R2_BUCKET || "integriti-forms";

  if (endpoint.includes("://")) {
    try {
      const url = new URL(endpoint);
      const pathBucket = url.pathname.replace(/^\//, "").split("/")[0];
      if (pathBucket) {
        bucket = pathBucket;
        url.pathname = "";
      }
      endpoint = url.origin;
    } catch {
      endpoint = endpoint.replace(/\/$/, "");
    }
  } else if (process.env.R2_ACCOUNT_ID) {
    endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  return { endpoint, bucket, accessKeyId, secretAccessKey };
}

function getClient() {
  if (client) return client;

  const { endpoint, bucket, accessKeyId, secretAccessKey } = parseR2Config();
  bucketName = bucket;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage is not configured");
  }

  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

function getBucket() {
  if (!bucketName) {
    bucketName = parseR2Config().bucket;
  }
  return bucketName;
}

export function buildStorageKey(shopDomain, formId, fileId, originalName) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${shopDomain}/${formId}/${fileId}/${safeName}`;
}

export async function createPresignedUploadUrl({
  shopDomain,
  formId,
  fieldId,
  originalName,
  mimeType,
  sizeBytes,
}) {
  const fileId = randomUUID();
  const storageKey = buildStorageKey(shopDomain, formId, fileId, originalName);

  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: storageKey,
    ContentType: mimeType,
    ContentLength: sizeBytes,
  });

  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 600 });

  return { fileId, storageKey, uploadUrl };
}

export async function createPresignedDownloadUrl(storageKey, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: storageKey,
  });
  return getSignedUrl(getClient(), command, { expiresIn });
}

export async function getFileBuffer(storageKey) {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: storageKey,
  });
  const response = await getClient().send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function isStorageConfigured() {
  try {
    const { endpoint, accessKeyId, secretAccessKey } = parseR2Config();
    return Boolean(endpoint && accessKeyId && secretAccessKey);
  } catch {
    return false;
  }
}

export function getStorageConfigError() {
  const { endpoint, accessKeyId, secretAccessKey } = parseR2Config();
  const missing = [];
  if (!endpoint) missing.push("R2_ENDPOINT or CLOUDFLARE_S3_API");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!missing.length) return null;
  return `File storage is missing env vars: ${missing.join(", ")}`;
}

export async function uploadBuffer({ storageKey, buffer, mimeType }) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
    })
  );
}
