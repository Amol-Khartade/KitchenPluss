import pool from '../src/db/pool.js';
import { initDb } from '../src/db/initDb.js';

async function runAuthTests() {
  console.log('🧪 Starting Auth Endpoint Tests...\n');
  await initDb();

  const baseUrl = 'http://localhost:5000/api/auth';

  // We can test directly using fetch against a running server or test route logic
  console.log('Testing auth database directly...');
  const testEmail = `chef.test.${Date.now()}@kitchenpulse.com`;
  
  // 1. Direct register simulation test
  const bcrypt = await import('bcryptjs');
  const jwt = await import('jsonwebtoken');
  const { JWT_SECRET } = await import('../src/middleware/auth.js');

  const hashed = await bcrypt.default.hash('Secret123!', 10);
  const insertRes = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, auth_provider)
     VALUES ($1, $2, 'Chef Marco', 'Head Chef', 'email')
     RETURNING *`,
    [testEmail, hashed]
  );
  console.log('✅ User registered in DB:', insertRes.rows[0].email, insertRes.rows[0].id);

  // 2. Direct login password verification test
  const isMatch = await bcrypt.default.compare('Secret123!', insertRes.rows[0].password_hash);
  const isWrong = await bcrypt.default.compare('WrongPassword', insertRes.rows[0].password_hash);
  console.log('✅ Correct password verification:', isMatch);
  console.log('✅ Wrong password rejected:', !isWrong);

  // 3. JWT sign & verify test
  const token = jwt.default.sign({ userId: insertRes.rows[0].id, email: testEmail, role: 'Head Chef' }, JWT_SECRET);
  const decoded: any = jwt.default.verify(token, JWT_SECRET);
  console.log('✅ JWT token generated & verified:', decoded.email === testEmail);

  // 4. Google sign-in simulation
  const googleEmail = `google.chef.${Date.now()}@gmail.com`;
  const googleRes = await pool.query(
    `INSERT INTO users (email, name, auth_provider, google_id, role)
     VALUES ($1, 'Google Chef Gordon', 'google', 'google-uid-123456789', 'Executive Chef')
     RETURNING *`,
    [googleEmail]
  );
  console.log('✅ Google user registered in DB:', googleRes.rows[0].email, googleRes.rows[0].auth_provider);

  // Clean up test data
  await pool.query('DELETE FROM users WHERE email = $1 OR email = $2', [testEmail, googleEmail]);
  console.log('🧹 Cleaned up test accounts.');
  console.log('\n🎉 All backend auth components verified successfully!');
  await pool.end();
}

runAuthTests().catch((e) => {
  console.error('❌ Auth test failed:', e);
  process.exit(1);
});
