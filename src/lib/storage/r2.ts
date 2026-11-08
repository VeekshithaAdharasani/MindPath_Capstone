import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'nova-ai';

export const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT || undefined,
  credentials: (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) ? {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  } : undefined,
});

export async function uploadToR2(key: string, buffer: Buffer, contentType: string = 'image/png') {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3.send(command);
  return {
    key,
    bucket: R2_BUCKET_NAME,
    url: `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`,
  };
}

export async function getPresignedUploadUrl(key: string, contentType: string = 'image/png', expiresIn: number = 3600) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  const presignedUrl = await getSignedUrl(s3, command, { expiresIn });
  return { presignedUrl, key };
}
