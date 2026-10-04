import { initDb } from '../src/db/initDb.js';

async function main() {
  console.log('Running migration...');
  await initDb();
  console.log('Migration finished successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
