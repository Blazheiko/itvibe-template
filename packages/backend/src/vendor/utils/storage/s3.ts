import * as Minio from "minio";
import diskConfig from "#config/disk.js";
import logger from "#logger";

const endpoint = (diskConfig.s3Endpoint ?? "").replace(/^https?:\/\//, "");

logger.info(
  { endpoint, bucket: diskConfig.s3Bucket, region: diskConfig.s3Region },
  "S3 config (minio)",
);

const minioClient = new Minio.Client({
  endPoint: endpoint,
  useSSL: diskConfig.s3Endpoint?.startsWith("http://") !== true,
  accessKey: diskConfig.s3AccessKeyId ?? "",
  secretKey: diskConfig.s3SecretAccessKey ?? "",
  region: diskConfig.s3Region ?? "us-east-1",
});

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
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");

  const finalKey = `${prefix}/${s3DynamicDataPrefix}/${key}`;

  const metaData: Record<string, string> = { "Content-Type": contentType };
  // Mark the object world-readable so the stable CDN URL we hand to the LLM and
  // bake into generated HTML actually resolves. Without this, S3-compatible
  // stores (e.g. DigitalOcean Spaces) keep objects private and the URL 403s.
  if (options.publicRead === true) {
    metaData["x-amz-acl"] = "public-read";
  }
  // Lets callers force `attachment` so that opening the asset URL directly in
  // a browser downloads the file instead of rendering it. Used for SVG, which
  // can contain XML that browsers would otherwise execute as a document — we
  // still rely on sanitization before upload; this is defense in depth.
  if (
    options.contentDisposition !== undefined &&
    options.contentDisposition.length > 0
  ) {
    metaData["Content-Disposition"] = options.contentDisposition;
  }

  await minioClient.putObject(bucket, finalKey, body, body.length, metaData);
}

export async function deleteFromS3(key: string): Promise<void> {
  const bucket = diskConfig.s3Bucket ?? "";
  logger.info({ bucket, key }, "Deleting object from S3");

  await minioClient.removeObject(bucket, key);
}

export async function presignUrl(
  key: string,
  expirySeconds = 3600,
): Promise<string> {
  const bucket = diskConfig.s3Bucket ?? "";
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");

  const finalKey = `${prefix}/${s3DynamicDataPrefix}/${key}`;
  return minioClient.presignedGetObject(bucket, finalKey, expirySeconds);
}

export async function downloadFromS3(
  key: string,
): Promise<{ data: Buffer; contentType: string | null }> {
  const bucket = diskConfig.s3Bucket ?? "";
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");

  const finalKey = `${prefix}/${s3DynamicDataPrefix}/${key}`;
  logger.info({ bucket, key: finalKey }, "Downloading from S3");

  const [stat, stream] = await Promise.all([
    minioClient.statObject(bucket, finalKey),
    minioClient.getObject(bucket, finalKey),
  ]);

  const contentType =
    (stat.metaData["content-type"] as string | undefined) ?? null;

  const data = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    stream.on("error", reject);
  });

  return { data, contentType };
}
