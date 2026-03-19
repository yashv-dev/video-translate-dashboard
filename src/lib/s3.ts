import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET || "test-public-stage-dubbing";
const PREFIX = process.env.S3_PREFIX || "heygenDub/";
const REGION = process.env.AWS_REGION || "us-east-1";

function getS3Client(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required for S3 operations");
  }
  return new S3Client({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function uploadToS3(params: {
  key: string;
  body: Buffer | ReadableStream;
  contentType?: string;
}): Promise<string> {
  const client = getS3Client();
  const fullKey = `${PREFIX}${params.key}`;

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fullKey,
      Body: params.body as Buffer,
      ContentType: params.contentType || "video/mp4",
    })
  );

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${fullKey}`;
}

export async function getPresignedDownloadUrl(key: string, expiresInSeconds = 7 * 24 * 60 * 60): Promise<string> {
  const client = getS3Client();
  const fullKey = key.startsWith(PREFIX) ? key : `${PREFIX}${key}`;

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fullKey,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
