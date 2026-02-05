import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src', 'database', 'generated');
const destDir = path.join(rootDir, 'dist', 'database', 'generated');

if (!fs.existsSync(srcDir)) {
  console.warn(`[copy-generated] Source not found: ${srcDir}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(destDir), { recursive: true });
fs.rmSync(destDir, { recursive: true, force: true });
fs.cpSync(srcDir, destDir, { recursive: true });

console.log(`[copy-generated] Copied ${srcDir} -> ${destDir}`);