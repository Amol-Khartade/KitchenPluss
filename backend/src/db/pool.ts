import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Try loading from cwd, then parent directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;

const databaseUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'admin'}:${process.env.POSTGRES_PASSWORD || 'password123'}@localhost:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'kitchenpulse'}`;

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[pool] Unexpected error on idle client:', err);
});

export default pool;
