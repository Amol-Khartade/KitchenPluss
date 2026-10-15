import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from project root and backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

const user = process.env.POSTGRES_USER || 'postgres';
const password = process.env.POSTGRES_PASSWORD || 'admin';
const host = 'localhost';
const port = Number(process.env.POSTGRES_PORT) || 5432;
const targetDb = process.env.POSTGRES_DB || 'kitchenpulse';

async function main() {
  console.log(`🔌 Connecting to PostgreSQL at ${host}:${port} as user "${user}"...`);

  // 1. Connect to postgres system database to ensure target database exists
  const sysClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  await sysClient.connect();
  const dbCheck = await sysClient.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [targetDb]
  );

  if (dbCheck.rows.length === 0) {
    console.log(`📦 Database "${targetDb}" does not exist. Creating...`);
    await sysClient.query(`CREATE DATABASE "${targetDb}";`);
    console.log(`✅ Database "${targetDb}" created successfully.`);
  } else {
    console.log(`ℹ️ Database "${targetDb}" already exists.`);
  }
  await sysClient.end();

  // 2. Connect to the target database and run all migrations in order
  const dbClient = new Client({
    host,
    port,
    user,
    password,
    database: targetDb,
  });

  await dbClient.connect();
  console.log(`🚀 Connected to "${targetDb}". Running schema migrations...`);

  const migrationsDir = path.resolve(__dirname, '../src/db/migrations');
  const migrationFiles = ['01_init.sql', '02_users.sql', '03_organizations.sql'];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  📄 Executing migration: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await dbClient.query(sql);
      console.log(`  ✅ ${file} applied successfully.`);
    } else {
      console.warn(`  ⚠️ Migration file not found: ${filePath}`);
    }
  }

  await dbClient.end();
  console.log('🎉 All migrations applied successfully!');
}

main().catch((err) => {
  console.error('❌ Database setup failed:', err);
  process.exit(1);
});
