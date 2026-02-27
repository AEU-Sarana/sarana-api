import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const rootDir = process.cwd();
const domainsMigrationsDir = path.join(
  rootDir,
  'src',
  'database',
  'prisma',
  'migrations',
  'domains',
);

function normalizeSqlIdentifier(identifier) {
  return identifier.replace(/^"|"$/g, '').trim();
}

function normalizeTableReference(reference) {
  const tablePart = reference.includes('.') ? reference.split('.').pop() : reference;
  if (!tablePart) return '';
  return normalizeSqlIdentifier(tablePart);
}

function listMigrationSqlFiles(baseDir) {
  if (!fs.existsSync(baseDir)) return [];

  const files = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === 'migration.sql') {
        files.push(fullPath);
      }
    }
  };

  walk(baseDir);
  return files;
}

function getExpectedTablesFromMigrations(baseDir, selectedDomains = []) {
  const domainFilters = selectedDomains
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  const sqlFiles = listMigrationSqlFiles(baseDir);
  const filesInScope =
    domainFilters.length === 0
      ? sqlFiles
      : sqlFiles.filter((filePath) => {
          const relativePath = path.relative(baseDir, filePath);
          const domain = relativePath.split(path.sep)[0]?.toLowerCase();
          return domainFilters.includes(domain);
        });

  const tableSet = new Set();
  const createTableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:"[^"]+"|[A-Za-z_][\w$]*)(?:\.(?:"[^"]+"|[A-Za-z_][\w$]*))?)/gi;

  for (const filePath of filesInScope) {
    const sql = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = createTableRegex.exec(sql)) !== null) {
      const tableName = normalizeTableReference(match[1]);
      if (tableName) tableSet.add(tableName);
    }
  }

  return {
    expectedTables: Array.from(tableSet).sort((a, b) => a.localeCompare(b)),
    migrationFileCount: filesInScope.length,
  };
}

async function checkMigrations() {
  const requestedDomains = process.argv.slice(2);

  try {
    // Check Prisma migrations table if it exists
    const migrationsTable = await pool.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
      ) AS exists
      `,
    );

    console.log('\n📋 Prisma Migrations Applied:');
    console.log('================================');
    if (!migrationsTable.rows[0].exists) {
      console.log('Prisma migrations table not found (using domain migrations only).');
    } else {
      const migrationsResult = await pool.query(`
        SELECT migration_name, finished_at, applied_steps_count
        FROM _prisma_migrations
        ORDER BY finished_at DESC
      `);

      if (migrationsResult.rows.length === 0) {
        console.log('No Prisma migrations found in database.');
      } else {
        migrationsResult.rows.forEach((migration) => {
          console.log(`- ${migration.migration_name} (${migration.finished_at || 'Pending'})`);
        });
      }
    }

    const { expectedTables, migrationFileCount } = getExpectedTablesFromMigrations(
      domainsMigrationsDir,
      requestedDomains,
    );

    if (requestedDomains.length > 0) {
      console.log(`\n🧩 Domains filter: ${requestedDomains.join(', ')}`);
    }
    console.log(`📁 Scanned migration files: ${migrationFileCount}`);

    // Check existing tables
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name
    `);

    console.log('\n📊 Tables in Database:');
    console.log('======================');
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in database.');
    } else {
      tablesResult.rows.forEach((table) => {
        console.log(`✓ ${table.table_name}`);
      });
    }

    console.log('\n🔍 Migration Status:');
    console.log('===================');
    if (expectedTables.length === 0) {
      console.log('⚠️  No expected tables found from migration files in selected scope.');
      console.log(`\n📈 Summary: 0/0 expected tables found`);
      console.log(`📦 Existing tables in DB: ${tablesResult.rows.length}`);
      return;
    }

    const existingTableNames = tablesResult.rows.map((table) => table.table_name);
    const existingSet = new Set(existingTableNames);
    const expectedSet = new Set(expectedTables);
    const missingTables = expectedTables.filter((table) => !existingSet.has(table));
    const extraTables = existingTableNames.filter((table) => !expectedSet.has(table));
    const matchedCount = expectedTables.filter((table) => existingSet.has(table)).length;

    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log('✅ All expected tables exist!');
    } else {
      if (missingTables.length > 0) {
        console.log('\n❌ Missing tables:');
        missingTables.forEach((table) => console.log(`  - ${table}`));
      }

      if (extraTables.length > 0) {
        console.log('\n⚠️  Extra tables (not in migration CREATE TABLE list):');
        extraTables.forEach((table) => console.log(`  - ${table}`));
      }
    }

    console.log(`\n📈 Summary: ${matchedCount}/${expectedTables.length} expected tables found`);
    console.log(`📦 Existing tables in DB: ${existingTableNames.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error checking migrations:', message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkMigrations();
