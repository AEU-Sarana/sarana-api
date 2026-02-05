#!/usr/bin/env node

/**
 * Script to apply a single migration file
 * Usage: node apply-single-migration.js <migration-file-path>
 * Example: node apply-single-migration.js src/database/prisma/migrations/domains/device-binding/20260118000010_add_pending_status/migration.sql
 */

import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationFilePath = process.argv[2];

if (!migrationFilePath) {
  console.error('❌ Error: Migration file path is required');
  console.log('Usage: node apply-single-migration.js <migration-file-path>');
  console.log('Example: node apply-single-migration.js src/database/prisma/migrations/domains/device-binding/20260118000010_add_pending_status/migration.sql');
  process.exit(1);
}

const fullPath = path.isAbsolute(migrationFilePath) 
  ? migrationFilePath 
  : path.join(__dirname, migrationFilePath);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Error: Migration file not found: ${fullPath}`);
  process.exit(1);
}

// pg requires password to be a string (avoids "client password must be a string")
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD ?? ''),
  database: process.env.DB_NAME || 'stock_pos',
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting to apply migration...');
    console.log(`📝 Migration file: ${fullPath}`);
    
    // Read migration SQL
    const sql = fs.readFileSync(fullPath, 'utf8');
    
    // Start transaction
    await client.query('BEGIN');
    
    try {
      // Execute migration
      await client.query(sql);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('✅ Migration applied successfully!');
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();

