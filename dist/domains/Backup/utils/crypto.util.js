"use strict";
// File: src/domains/Backup/utils/crypto.util.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptFile = encryptFile;
exports.decryptFile = decryptFile;
exports.sha256File = sha256File;
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
function parseBackupKey(keyBase64) {
    if (!keyBase64) {
        throw new Error('BACKUP_ENCRYPTION_KEY is required');
    }
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
        throw new Error('BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key for AES-256-GCM');
    }
    return key;
}
// File format: [12B IV][ciphertext...][16B authTag]
async function encryptFile(inputPath, outputPath, keyBase64) {
    const key = parseBackupKey(keyBase64);
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', key, iv);
    const inStream = fs_1.default.createReadStream(inputPath);
    const outStream = fs_1.default.createWriteStream(outputPath);
    outStream.write(iv);
    inStream.pipe(cipher).pipe(outStream);
    await new Promise((resolve, reject) => {
        outStream.on('finish', resolve);
        outStream.on('error', reject);
    });
    const tag = cipher.getAuthTag();
    fs_1.default.appendFileSync(outputPath, tag);
}
async function decryptFile(inputPath, outputPath, keyBase64) {
    const data = fs_1.default.readFileSync(inputPath);
    const iv = data.subarray(0, 12);
    const tag = data.subarray(data.length - 16);
    const ciphertext = data.subarray(12, data.length - 16);
    const key = parseBackupKey(keyBase64);
    const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    fs_1.default.writeFileSync(outputPath, plaintext);
}
function sha256File(filePath) {
    const hash = crypto_1.default.createHash('sha256');
    const data = fs_1.default.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
}
//# sourceMappingURL=crypto.util.js.map