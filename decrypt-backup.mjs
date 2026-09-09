import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const backupKey = process.env.BACKUP_ENCRYPTION_KEY;
if (!backupKey) {
  console.error('❌ Error: BACKUP_ENCRYPTION_KEY missing in .env');
  process.exit(1);
}

const key = Buffer.from(backupKey, 'base64');
const inputFile = process.argv[2];

if (!inputFile) {
  console.log('Usage: node decrypt-backup.mjs <file.sql.enc> [output.sql]');
  process.exit(0);
}

const outputFile = process.argv[3] || inputFile.replace(/\.enc$/, '');

try {
  const data = fs.readFileSync(inputFile);
  const iv = data.subarray(0, 12);
  const tag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(12, data.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  fs.writeFileSync(outputFile, plaintext);
  console.log(`✅ Backup decrypted successfully!`);
  console.log(`📄 Saved readable SQL file to: ${path.resolve(outputFile)}`);
} catch (err) {
  console.error('❌ Failed to decrypt backup file:', err.message);
}
