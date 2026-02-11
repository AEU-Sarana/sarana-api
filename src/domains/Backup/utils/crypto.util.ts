// File: src/domains/Backup/utils/crypto.util.ts

import fs from 'fs';
import crypto from 'crypto';

// File format: [12B IV][ciphertext...][16B authTag]
export async function encryptFile(inputPath: string, outputPath: string, keyBase64: string): Promise<void> {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const inStream = fs.createReadStream(inputPath);
  const outStream = fs.createWriteStream(outputPath);

  outStream.write(iv);
  inStream.pipe(cipher).pipe(outStream);

  await new Promise((resolve, reject) => {
    outStream.on('finish', resolve);
    outStream.on('error', reject);
  });

  const tag = cipher.getAuthTag();
  fs.appendFileSync(outputPath, tag);
}

export async function decryptFile(inputPath: string, outputPath: string, keyBase64: string): Promise<void> {
  const data = fs.readFileSync(inputPath);
  const iv = data.subarray(0, 12);
  const tag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(12, data.length - 16);

  const key = Buffer.from(keyBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  fs.writeFileSync(outputPath, plaintext);
}

export function sha256File(filePath: string): string {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}