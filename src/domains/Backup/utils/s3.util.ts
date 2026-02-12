// File: src/domains/Backup/utils/s3.util.ts

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

export function buildS3Client(): S3Client {
  const region = process.env.S3_REGION || process.env.STORAGE_REGION || 'us-east-1';
  const endpoint = process.env.S3_ENDPOINT || process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.STORAGE_ACCESS_KEY || '';
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.STORAGE_SECRET_KEY || '';

  return new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export async function putObject(client: S3Client, bucket: string, key: string, body: Buffer): Promise<void> {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
}

export async function getObjectToFile(client: S3Client, bucket: string, key: string, outPath: string): Promise<void> {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = res.Body as any;
  const out = fs.createWriteStream(outPath);
  await new Promise((resolve, reject) => {
    stream.pipe(out);
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

export async function deleteObject(client: S3Client, bucket: string, key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function presignGetUrl(client: S3Client, bucket: string, key: string, expiresInSeconds: number): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSeconds });
}
