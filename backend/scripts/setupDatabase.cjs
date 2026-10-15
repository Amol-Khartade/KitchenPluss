const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Connecting to postgres system database...');
  const sysClient = new Client({
    connectionString: 'postgresql://postgres:admin@localhost:5432/postgres',
  });
  await sysClient.connect();

  const check = await sysClient.query("SELECT 1 FROM pg_database WHERE datname = 'kitchenpulse'");
  if (check.rows.length === 0) {
    console.log("Database 'kitchenpulse' not found. Creating...");
    await sysClient.query('CREATE DATABASE kitchenpulse');
    console.log("Database 'kitchenpulse' created successfully.");
  } else {
    console.log("Database 'kitchenpulse' already exists.");
  }
  await sysClient.end();

  console.log('Connecting to kitchenpulse database...');
  const dbClient = new Client({
    connectionString: 'postgresql://postgres:admin@localhost:5432/kitchenpulse',
  });
  await dbClient.connect();

  const migrations = ['01_init.sql', '02_users.sql', '03_organizations.sql'];
  for (const m of migrations) {
    const file = path.join(__dirname, '../src/db/migrations', m);
    if (fs.existsSync(file)) {
      console.log(`Applying migration ${m}...`);
      const sql = fs.readFileSync(file, 'utf8');
      await dbClient.query(sql);
      console.log(`Migration ${m} applied successfully.`);
    }
  }

  await dbClient.end();
  console.log('Schema setup complete!');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
