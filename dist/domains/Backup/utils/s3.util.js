"use strict";
// File: src/domains/Backup/utils/s3.util.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildS3Client = buildS3Client;
exports.putObject = putObject;
exports.getObjectToFile = getObjectToFile;
exports.deleteObject = deleteObject;
exports.presignGetUrl = presignGetUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const fs_1 = __importDefault(require("fs"));
function buildS3Client() {
    const region = process.env.S3_REGION || process.env.STORAGE_REGION || (process.env.R2_ENDPOINT ? 'auto' : 'us-east-1');
    const endpoint = process.env.S3_ENDPOINT || process.env.STORAGE_ENDPOINT || process.env.R2_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.STORAGE_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.STORAGE_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY || '';
    return new client_s3_1.S3Client({
        region,
        endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: true,
    });
}
async function putObject(client, bucket, key, body) {
    await client.send(new client_s3_1.PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
}
async function getObjectToFile(client, bucket, key, outPath) {
    const res = await client.send(new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: key }));
    const stream = res.Body;
    const out = fs_1.default.createWriteStream(outPath);
    await new Promise((resolve, reject) => {
        stream.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
    });
}
async function deleteObject(client, bucket, key) {
    await client.send(new client_s3_1.DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
async function presignGetUrl(client, bucket, key, expiresInSeconds) {
    return (0, s3_request_presigner_1.getSignedUrl)(client, new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSeconds });
}
//# sourceMappingURL=s3.util.js.map