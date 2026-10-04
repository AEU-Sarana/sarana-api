import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

// -------------------------
// naming helpers
// -------------------------
function toPascalCase(str) {
  return str
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toCamelCase(str) {
  const p = toPascalCase(str);
  return p ? p.charAt(0).toLowerCase() + p.slice(1) : p;
}

// small singularize
function singularize(word) {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ses')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function buildModelName(tableName) {
  return toPascalCase(singularize(tableName));
}

function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function ensureGeneratorAndDatasource(schemaText) {
  const hasGenerator = /(^|\n)\s*generator\s+client\s*\{/m.test(schemaText);
  const hasDatasource = /(^|\n)\s*datasource\s+db\s*\{/m.test(schemaText);

  const generatorBlock =
`generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

`;

  const datasourceBlock =
`datasource db {
  provider = "postgresql"
}

`;

  let prefix = '';
  if (!hasGenerator) prefix += generatorBlock;
  if (!hasDatasource) prefix += datasourceBlock;

  if (!prefix) return schemaText;
  return prefix + '\n' + schemaText.trimStart();
}

function injectGeneratorOutput(schemaText) {
  const generatorRegex = /generator\s+client\s*{[\s\S]*?}/;
  const match = schemaText.match(generatorRegex);
  if (!match) throw new Error('Could not find "generator client" block');

  const lines = match[0].split('\n').filter((l) => !/^\s*binaryTargets\s*=/.test(l));

  let hasOutput = false;
  let providerIndex = -1;

  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*provider\s*=/.test(lines[i])) providerIndex = i;
    if (/^\s*output\s*=/.test(lines[i])) {
      lines[i] = '  output        = "../generated"';
      hasOutput = true;
    }
  }

  if (!hasOutput) {
    const insertAt = providerIndex >= 0 ? providerIndex + 1 : 1;
    lines.splice(insertAt, 0, '  output        = "../generated"');
  }

  const binaryTargetLine = '  binaryTargets = ["native", "rhel-openssl-3.0.x"]';
  lines.splice(lines.length - 1, 0, binaryTargetLine);

  return schemaText.replace(generatorRegex, lines.join('\n'));
}

// -------------------------
// parse helpers
// -------------------------
function getRawModels(schemaText) {
  const modelDecl = /^\s*model\s+([A-Za-z0-9_]+)\s*\{/gm;
  const raw = [];
  let m;
  while ((m = modelDecl.exec(schemaText)) !== null) raw.push(m[1]);
  return raw;
}

function getModelBlocks(schemaText) {
  const blocks = [];
  const re = /^\s*model\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)^\s*\}/gm;
  let m;
  while ((m = re.exec(schemaText)) !== null) {
    blocks.push({ name: m[1], body: m[2], full: m[0] });
  }
  return blocks;
}

function isCommentOrBlockMeta(trimmed) {
  return (
    trimmed.startsWith('@@') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('*/')
  );
}

// field line parse: name type ?/[] rest
function parseFieldLine(line) {
  const mm =
    /^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s+)([A-Za-z][A-Za-z0-9_]*)(\??|\[\])?([\s\S]*)$/.exec(line);
  if (!mm) return null;
  return {
    indent: mm[1],
    name: mm[2],
    gap: mm[3],
    type: mm[4],
    optOrArr: mm[5] ?? '',
    rest: mm[6] ?? '',
  };
}

function extractArrayArg(rest, key) {
  const m = new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`).exec(rest);
  if (!m) return null;
  return m[1]
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function replaceArrayArg(rest, key, items) {
  const re = new RegExp(`${key}:\\s*\\[[^\\]]*\\]`);
  if (!re.test(rest)) return rest;
  return rest.replace(re, `${key}: [${items.join(', ')}]`);
}

// -------------------------
// relation naming (collision-safe)
// -------------------------
function relationNameFromFkFields(targetModel, fkFields) {
  if (!fkFields || fkFields.length === 0) return lowerFirst(targetModel);

  const fk = fkFields[0];
  if (fk === 'userId') return 'user';

  // If ends with Id (e.g. approverId) -> approver
  if (fk.endsWith('Id') && fk.length > 2) {
    return fk.slice(0, -2);
  }

  // If ends with By (createdBy, updatedBy, approvedBy) -> createdByUser
  if (fk.endsWith('By')) {
    return `${fk}${targetModel}`;
  }

  // fallback
  return `${fk}${targetModel}`;
}

// -------------------------
// TRANSFORM
// -------------------------
function transformSchema(schemaText) {
  // 0) build model name map (convert EVERYTHING)
  const rawModels = getRawModels(schemaText);
  const modelMap = new Map(); // old -> new
  for (const oldName of rawModels) {
    modelMap.set(oldName, buildModelName(oldName));
  }

  const newModelNames = new Set([...modelMap.values()]);

  let out = schemaText;

  // 1) rename model declarations
  for (const [oldName, newName] of modelMap.entries()) {
    if (oldName === newName) continue;
    out = out.replace(
      new RegExp(`(^\\s*model\\s+)${oldName}(\\s*\\{)`, 'gm'),
      `$1${newName}$2`,
    );
  }

  // 2) rename type references on field lines robustly (aligned)
  for (const [oldName, newName] of modelMap.entries()) {
    if (oldName === newName) continue;
    out = out.replace(
      new RegExp(`(^\\s*[A-Za-z_][A-Za-z0-9_]*\\s+)${oldName}(\\??|\\[\\])?(?=\\s|$|@)`, 'gm'),
      `$1${newName}$2`,
    );
  }

  // 3) Build scalar field maps per model (snake_case scalar -> camelCase)
  const fieldMapsByModel = new Map(); 
  const blocksNow = getModelBlocks(out);

  for (const b of blocksNow) {
    const lines = b.body.split('\n');
    const fieldMap = new Map();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || isCommentOrBlockMeta(trimmed)) continue;

      const f = parseFieldLine(line);
      if (!f) continue;

      const { name: oldField, type: typeName } = f;

      // only underscore scalar fields; skip relation fields
      if (!oldField.includes('_')) continue;
      if (newModelNames.has(typeName)) continue;

      fieldMap.set(oldField, toCamelCase(oldField));
    }

    fieldMapsByModel.set(b.name, fieldMap);
  }

  // 4) Rewrite each model block
  out = out.replace(
    /^\s*model\s+(\w+)\s*\{([\s\S]*?)^\s*\}/gm,
    (full, modelName, body) => {
      const oldTable =
        [...modelMap.entries()].find(([, v]) => v === modelName)?.[0] ?? null;

      const fieldMap = fieldMapsByModel.get(modelName) ?? new Map();
      const lines = body.split('\n');

      // gather relation lines first to detect collisions (same target model)
      const relationInfos = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || isCommentOrBlockMeta(trimmed)) continue;
        const f = parseFieldLine(line);
        if (!f) continue;
        if (!newModelNames.has(f.type)) continue;
        relationInfos.push({ line, parsed: f });
      }

      // count relations per target model
      const relCountByTarget = new Map();
      for (const r of relationInfos) {
        relCountByTarget.set(r.parsed.type, (relCountByTarget.get(r.parsed.type) ?? 0) + 1);
      }

      // track used field names to avoid duplicates
      const usedFieldNames = new Set();
      for (const line of lines) {
        const f = parseFieldLine(line);
        if (f) usedFieldNames.add(f.name);
      }

      const updatedLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || isCommentOrBlockMeta(trimmed)) return line;

        const f = parseFieldLine(line);
        if (!f) return line;

        const { indent, name: fieldName, gap, type: typeName, optOrArr, rest } = f;

        // Relation field?
        if (newModelNames.has(typeName)) {
          // never @map on relation fields
          let newRest = rest;

          // Fix @relation(fields:[...]) based on this model fieldMap (snake->camel)
          const fieldItems = extractArrayArg(newRest, 'fields');
          let fkFieldsCamel = fieldItems;
          if (fieldItems) {
            const converted = fieldItems.map((tok) => {
              if (fieldMap.has(tok)) return fieldMap.get(tok);
              if (tok.includes('_')) return toCamelCase(tok);
              return tok;
            });
            fkFieldsCamel = converted;
            newRest = replaceArrayArg(newRest, 'fields', converted);
          }

          // Fix @relation(references:[...]) based on target model fieldMap
          const targetFieldMap = fieldMapsByModel.get(typeName) ?? new Map();
          const refItems = extractArrayArg(newRest, 'references');
          if (refItems) {
            const converted = refItems.map((tok) => {
              if (targetFieldMap.has(tok)) return targetFieldMap.get(tok);
              if (tok.includes('_')) return toCamelCase(tok);
              return tok;
            });
            newRest = replaceArrayArg(newRest, 'references', converted);
          }

          // Rename relation field name (collision-safe)
          let newName = fieldName;

          // if multiple relations to same target, base name on fk fields
          const multi = (relCountByTarget.get(typeName) ?? 0) > 1;

          if (optOrArr !== '[]') {
            if (multi) {
              newName = relationNameFromFkFields(typeName, fkFieldsCamel);
            } else {
              newName = lowerFirst(typeName); // single relation -> user, product, order...
            }

            // ensure unique
            if (newName !== fieldName) {
              let candidate = newName;
              let i = 2;
              while (usedFieldNames.has(candidate)) {
                candidate = `${newName}${i}`;
                i += 1;
              }
              usedFieldNames.delete(fieldName);
              usedFieldNames.add(candidate);
              newName = candidate;
            }
          }

          return `${indent}${newName}${gap}${typeName}${optOrArr}${newRest}`;
        }

        // Scalar field: rename snake_case -> camelCase + @map
        const newScalar = fieldMap.get(fieldName);
        if (!newScalar) return `${indent}${fieldName}${gap}${typeName}${optOrArr}${rest}`;

        if (/@map\(".*"\)/.test(rest)) {
          return `${indent}${newScalar}${gap}${typeName}${optOrArr}${rest}`;
        }
        return `${indent}${newScalar}${gap}${typeName}${optOrArr}${rest} @map("${fieldName}")`;
      });

      let updatedBody = updatedLines.join('\n');

      // Fix @@index/@@unique/@@id arrays using current model fieldMap
      for (const [oldField, newField] of fieldMap.entries()) {
        updatedBody = updatedBody.replace(
          new RegExp(`(@@index\\(\\[[^\\]]*)\\b${oldField}\\b`, 'g'),
          `$1${newField}`,
        );
        updatedBody = updatedBody.replace(
          new RegExp(`(@@unique\\(\\[[^\\]]*)\\b${oldField}\\b`, 'g'),
          `$1${newField}`,
        );
        updatedBody = updatedBody.replace(
          new RegExp(`(@@id\\(\\[[^\\]]*)\\b${oldField}\\b`, 'g'),
          `$1${newField}`,
        );
      }

      // Add @@map("table_name") if renamed
      if (oldTable && oldTable !== modelName) {
        if (!/\n\s*@@map\(/.test(updatedBody)) {
          updatedBody += `\n  @@map("${oldTable}")`;
        }
      }

      return `model ${modelName} {${updatedBody}\n}\n`;
    },
  );

  return out;
}

// -------------------------
// MAIN
// -------------------------
const rootDir = process.cwd();
const sourceSchemaPath = path.join(rootDir, 'src', 'database', 'prisma', 'introspected.prisma');
const generatedDir = path.join(rootDir, 'src', 'database', 'generated');
const generatedSchemaPath = path.join(generatedDir, 'schema.prisma');

if (!fs.existsSync(sourceSchemaPath)) {
  console.error(`Schema not found: ${sourceSchemaPath}`);
  console.error('Run: pnpm db:pull first (it writes introspected.prisma)');
  process.exit(1);
}

let schema = fs.readFileSync(sourceSchemaPath, 'utf8');
schema = ensureGeneratorAndDatasource(schema);
schema = injectGeneratorOutput(schema);

// Convert naming
const updatedSchema = transformSchema(schema);

// Safety check for generatedDir
const relativeGeneratedDir = path.relative(rootDir, generatedDir);
if (
  relativeGeneratedDir.startsWith('..') ||
  (path.isAbsolute(relativeGeneratedDir) === false && relativeGeneratedDir === '')
) {
  console.error('Refusing to clean generated directory: unexpected path');
  process.exit(1);
}

// Recreate generated directory
if (fs.existsSync(generatedDir)) {
  fs.rmSync(generatedDir, { recursive: true, force: true });
}
fs.mkdirSync(generatedDir, { recursive: true });

// Write generated schema
fs.writeFileSync(generatedSchemaPath, updatedSchema);

// Run prisma generate against generated schema
const prismaBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);

const result = spawnSync(prismaBin, ['generate', '--schema', generatedSchemaPath], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

// Post-generate: create per-model type files
const modelRegex = /^\s*model\s+(\w+)\s*{/gm;
const modelNames = [];
let matchModel;
while ((matchModel = modelRegex.exec(updatedSchema)) !== null) {
  modelNames.push(matchModel[1]);
}

const modelsDir = path.join(generatedDir, 'models');
fs.mkdirSync(modelsDir, { recursive: true });

const modelFileHeader =
  '/* !!! This file is auto-generated by db-generate.mjs. Do not edit directly. !!! */\n' +
  '/* eslint-disable */\n' +
  '// biome-ignore-all lint: generated file\n' +
  '// @ts-nocheck\n';

for (const modelName of modelNames) {
  const modelFilePath = path.join(modelsDir, `${modelName}.ts`);
  const modelFileBody =
    `${modelFileHeader}\n` +
    `export * from '../index'\n` +
    `export type ${modelName}Model = import('../index').${modelName}\n`;
  fs.writeFileSync(modelFilePath, modelFileBody);
}

const modelsBarrelPath = path.join(generatedDir, 'models.ts');
const modelsBarrel =
  `${modelFileHeader}\n` +
  modelNames.map((name) => `export * from './models/${name}'`).join('\n') +
  '\n';

fs.writeFileSync(modelsBarrelPath, modelsBarrel);

// Also mirror to dist/database/generated for compiled production build runtime
const distDatabaseDir = path.join(rootDir, 'dist', 'database');
const distGeneratedDir = path.join(distDatabaseDir, 'generated');
fs.mkdirSync(distDatabaseDir, { recursive: true });
fs.cpSync(generatedDir, distGeneratedDir, { recursive: true });

process.exit(0);