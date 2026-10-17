import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import diskConfig from "#config/disk.js";
import logger from "#logger";

const rawEndpoint = diskConfig.s3Endpoint ?? "";
// Keep the old minio behaviour: an endpoint without a scheme means HTTPS.
const endpoint =
  rawEndpoint.length === 0 || /^https?:\/\//.test(rawEndpoint)
    ? rawEndpoint
    : `https://${rawEndpoint}`;

logger.info(
  { endpoint, bucket: diskConfig.s3Bucket, region: diskConfig.s3Region },
  "S3 config (aws-sdk)",
);

const s3Client = new S3Client({
  ...(endpoint.length > 0 ? { endpoint } : {}),
  region: diskConfig.s3Region ?? "us-east-1",
  credentials: {
    accessKeyId: diskConfig.s3AccessKeyId ?? "",
    secretAccessKey: diskConfig.s3SecretAccessKey ?? "",
  },
  // Custom endpoints (MinIO, DigitalOcean Spaces, ...) are addressed path-style,
  // which is what the minio client did for non-AWS hosts.
  forcePathStyle: endpoint.length > 0 && !endpoint.includes("amazonaws.com"),
  // Newer SDK versions add CRC checksums to every request by default; several
  // S3-compatible stores reject them, so only send checksums when required.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

function buildKey(key: string): string {
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");
  return `${prefix}/${s3DynamicDataPrefix}/${key}`;
}

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
  options: { publicRead?: boolean; contentDisposition?: string } = {},
): Promise<void> {
  const bucket = diskConfig.s3Bucket ?? "";
  logger.info(
    { bucket, key, contentType, size: body.length, public: options.publicRead },
    "Uploading to S3",
  );

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: buildKey(key),
      Body: body,
      ContentLength: body.length,
      ContentType: contentType,
      // Mark the object world-readable so the stable CDN URL we hand to the LLM and
      // bake into generated HTML actually resolves. Without this, S3-compatible
      // stores (e.g. DigitalOcean Spaces) keep objects private and the URL 403s.
      ...(options.publicRead === true ? { ACL: "public-read" as const } : {}),
      // Lets callers force `attachment` so that opening the asset URL directly in
      // a browser downloads the file instead of rendering it. Used for SVG, which
      // can contain XML that browsers would otherwise execute as a document — we
      // still rely on sanitization before upload; this is defense in depth.
      ...(options.contentDisposition !== undefined &&
      options.contentDisposition.length > 0
        ? { ContentDisposition: options.contentDisposition }
        : {}),
    }),
  );
}

export async function deleteFromS3(key: string): Promise<void> {
  const bucket = diskConfig.s3Bucket ?? "";
  logger.info({ bucket, key }, "Deleting object from S3");

  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function presignUrl(
  key: string,
  expirySeconds = 3600,
): Promise<string> {
  const bucket = diskConfig.s3Bucket ?? "";
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucket, Key: buildKey(key) }),
    { expiresIn: expirySeconds },
  );
}

export async function downloadFromS3(
  key: string,
): Promise<{ data: Buffer; contentType: string | null }> {
  const bucket = diskConfig.s3Bucket ?? "";
  const finalKey = buildKey(key);
  logger.info({ bucket, key: finalKey }, "Downloading from S3");

  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: finalKey }),
  );
  if (response.Body === undefined) {
    throw new Error(`S3 object has no body: ${finalKey}`);
  }

  const data = Buffer.from(await response.Body.transformToByteArray());
  return { data, contentType: response.ContentType ?? null };
}
