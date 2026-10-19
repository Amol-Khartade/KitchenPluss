import 'dotenv/config';

async function testFlow() {
  console.log('Testing login flow directly against 5000 and 3000...');
  
  // 1. Login to 5000
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@grandpalace.com', password: 'password123' })
  });
  console.log('Login status (5000):', loginRes.status);
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Token received:', token?.substring(0, 25) + '...');
  console.log('User:', loginData.user?.email, 'Org:', loginData.organization?.name);

  // 2. Fetch /me from 5000
  const me5000 = await fetch('http://localhost:5000/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('/api/auth/me status (5000):', me5000.status);
  const me5000Data = await me5000.json();
  console.log('5000 Me result:', me5000Data);

  // 3. Fetch /me from 3000 (Vite proxy)
  try {
    const me3000 = await fetch('http://localhost:3000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('/api/auth/me status (3000):', me3000.status);
    const me3000Data = await me3000.json();
    console.log('3000 Me result:', me3000Data);
  } catch (err: any) {
    console.log('3000 Me failed:', err.message);
  }
}

testFlow().catch(console.error);
