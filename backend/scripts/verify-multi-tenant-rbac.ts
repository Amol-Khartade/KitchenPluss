/**
 * Verification Script — Multi-Tenant Client Isolation & RBAC Test
 */

import pool from '../src/db/pool.js';
import '../src/index.js'; // Starts server on port 5000 automatically

const PORT = Number(process.env.PORT) || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('🧪 Starting End-to-End Multi-Tenant & RBAC Verification Tests...\n');

  // Wait 1.5s for server and initDb to complete startup
  await new Promise((r) => setTimeout(r, 1500));

  try {
    // ------------------------------------------------------------------ //
    // Test 1: Organizations Retrieval
    // ------------------------------------------------------------------ //
    console.log('Test 1: Public Organizations endpoint');
    const orgsRes = await fetch(`${BASE_URL}/api/auth/organizations`);
    const orgsData = await orgsRes.json();
    console.log(`  -> Status: ${orgsRes.status}`);
    console.log(`  -> Found ${orgsData.organizations?.length} organizations:`, orgsData.organizations?.map((o: any) => o.name));
    if (!orgsData.organizations || orgsData.organizations.length < 2) {
      throw new Error('Test 1 Failed: Expected at least 2 organizations');
    }
    console.log('  ✅ Test 1 Passed!\n');

    // ------------------------------------------------------------------ //
    // Test 2: Login as Grand Palace Owner
    // ------------------------------------------------------------------ //
    console.log('Test 2: Login as Grand Palace Owner (owner@grandpalace.com)');
    const gpLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@grandpalace.com', password: 'password123' }),
    });
    const gpAuth = await gpLoginRes.json();
    console.log(`  -> Status: ${gpLoginRes.status}`);
    console.log(`  -> User: ${gpAuth.user?.name}, Role: ${gpAuth.user?.role}`);
    console.log(`  -> Organization: ${gpAuth.organization?.name} (id: ${gpAuth.organization?.id})`);
    if (gpAuth.user?.role !== 'Owner' || !gpAuth.token) {
      throw new Error('Test 2 Failed: Invalid owner login response');
    }
    const gpToken = gpAuth.token;
    console.log('  ✅ Test 2 Passed!\n');

    // ------------------------------------------------------------------ //
    // Test 3: Login as Bella Napoli Owner
    // ------------------------------------------------------------------ //
    console.log('Test 3: Login as Bella Napoli Owner (owner@bellanapoli.com)');
    const bnLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@bellanapoli.com', password: 'password123' }),
    });
    const bnAuth = await bnLoginRes.json();
    console.log(`  -> Status: ${bnLoginRes.status}`);
    console.log(`  -> User: ${bnAuth.user?.name}, Role: ${bnAuth.user?.role}`);
    console.log(`  -> Organization: ${bnAuth.organization?.name}`);
    const bnToken = bnAuth.token;
    console.log('  ✅ Test 3 Passed!\n');

    // ------------------------------------------------------------------ //
    // Test 4: Login as Grand Palace Line Cook
    // ------------------------------------------------------------------ //
    console.log('Test 4: Login as Line Cook (cook@grandpalace.com)');
    const cookLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cook@grandpalace.com', password: 'password123' }),
    });
    const cookAuth = await cookLoginRes.json();
    console.log(`  -> User: ${cookAuth.user?.name}, Role: ${cookAuth.user?.role}`);
    const cookToken = cookAuth.token;
    console.log('  ✅ Test 4 Passed!\n');

    // ------------------------------------------------------------------ //
    // Test 5: Multi-Tenant Data Isolation (Tickets & Recipes)
    // ------------------------------------------------------------------ //
    console.log('Test 5: Multi-Tenant Data Isolation (Grand Palace vs Bella Napoli)');

    // Fetch Grand Palace tickets
    const gpTicketsRes = await fetch(`${BASE_URL}/api/tickets`, {
      headers: { Authorization: `Bearer ${gpToken}` },
    });
    const gpTickets = await gpTicketsRes.json();
    console.log(`  -> Grand Palace Tickets count: ${gpTickets.length}`);
    console.log(`     Items: ${gpTickets.map((t: any) => t.recipe_name).join(', ')}`);

    // Fetch Bella Napoli tickets
    const bnTicketsRes = await fetch(`${BASE_URL}/api/tickets`, {
      headers: { Authorization: `Bearer ${bnToken}` },
    });
    const bnTickets = await bnTicketsRes.json();
    console.log(`  -> Bella Napoli Tickets count: ${bnTickets.length}`);
    console.log(`     Items: ${bnTickets.map((t: any) => t.recipe_name).join(', ')}`);

    // Verify no overlap
    const gpNames = new Set(gpTickets.map((t: any) => t.recipe_name));
    const bnNames = new Set(bnTickets.map((t: any) => t.recipe_name));
    for (const name of gpNames) {
      if (bnNames.has(name)) {
        throw new Error(`Data leak detected! Recipe "${name}" found in both organizations`);
      }
    }
    console.log('  ✅ Test 5 Passed: Zero ticket overlap between client organizations!\n');

    // ------------------------------------------------------------------ //
    // Test 6: Multi-Tenant Ingredients Stock Isolation
    // ------------------------------------------------------------------ //
    console.log('Test 6: Multi-Tenant Stock Isolation');
    const gpStockRes = await fetch(`${BASE_URL}/api/ingredients`, {
      headers: { Authorization: `Bearer ${gpToken}` },
    });
    const gpStock = await gpStockRes.json();
    console.log(`  -> Grand Palace Ingredients: ${gpStock.map((i: any) => i.name).slice(0, 4).join(', ')}...`);

    const bnStockRes = await fetch(`${BASE_URL}/api/ingredients`, {
      headers: { Authorization: `Bearer ${bnToken}` },
    });
    const bnStock = await bnStockRes.json();
    console.log(`  -> Bella Napoli Ingredients: ${bnStock.map((i: any) => i.name).slice(0, 4).join(', ')}...`);

    const hasPizzaFlourInGP = gpStock.some((i: any) => i.name.includes('Pizza Flour'));
    const hasChickenInBN = bnStock.some((i: any) => i.name.includes('Chicken Breast'));
    if (hasPizzaFlourInGP || hasChickenInBN) {
      throw new Error('Data leak in ingredients stock!');
    }
    console.log('  ✅ Test 6 Passed: Complete stock isolation between tenants!\n');

    // ------------------------------------------------------------------ //
    // Test 7: User Management RBAC (Owner vs Line Cook)
    // ------------------------------------------------------------------ //
    console.log('Test 7: User Management Access Control');

    // Owner accesses /api/users -> Should succeed (200)
    const gpUsersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${gpToken}` },
    });
    const gpUsersData = await gpUsersRes.json();
    console.log(`  -> Owner access to /api/users: status ${gpUsersRes.status}`);
    console.log(`     Team members in Grand Palace: ${gpUsersData.users?.map((u: any) => `${u.name} (${u.role})`).join(', ')}`);
    if (gpUsersRes.status !== 200 || !gpUsersData.users) {
      throw new Error('Test 7 Failed: Owner should have access to /api/users');
    }

    // Line Cook accesses /api/users -> Should be blocked with 403 Forbidden!
    const cookUsersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${cookToken}` },
    });
    console.log(`  -> Line Cook access to /api/users: status ${cookUsersRes.status} (Expected: 403 Forbidden)`);
    if (cookUsersRes.status !== 403) {
      throw new Error(`Test 7 Failed: Line Cook should be 403 Forbidden, got ${cookUsersRes.status}`);
    }
    console.log('  ✅ Test 7 Passed: RBAC successfully protects user data from non-admin roles!\n');

    // ------------------------------------------------------------------ //
    // Test 8: Owner adds new team member via User Management
    // ------------------------------------------------------------------ //
    console.log('Test 8: Owner creates new user in organization');
    const newUserEmail = `sous.chef.${Date.now()}@grandpalace.com`;
    const createMemberRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gpToken}`,
      },
      body: JSON.stringify({
        email: newUserEmail,
        name: 'Auguste Escoffier',
        role: 'Sous Chef',
        password: 'password123',
      }),
    });
    const newMemberData = await createMemberRes.json();
    console.log(`  -> Status: ${createMemberRes.status}`);
    console.log(`  -> Created user: ${newMemberData.user?.name} as ${newMemberData.user?.role}`);
    if (createMemberRes.status !== 201) {
      throw new Error('Test 8 Failed: Owner should be able to create new team member');
    }
    console.log('  ✅ Test 8 Passed!\n');

    // ------------------------------------------------------------------ //
    // Test 9: Registering a brand new Hotel as an Owner
    // ------------------------------------------------------------------ //
    console.log('Test 9: Register a brand new Hotel Client Organization');
    const newHotelName = `The Royal Windsor Hotel ${Date.now()}`;
    const newHotelOwnerEmail = `owner.${Date.now()}@windsor.com`;
    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Lord Windsor',
        email: newHotelOwnerEmail,
        password: 'password123',
        organization_name: newHotelName,
      }),
    });
    const registerData = await registerRes.json();
    console.log(`  -> Status: ${registerRes.status}`);
    console.log(`  -> Created Hotel: "${registerData.organization?.name}" (code: ${registerData.organization?.code})`);
    console.log(`  -> Assigned Role: ${registerData.user?.role}`);
    if (registerRes.status !== 201 || registerData.user?.role !== 'Owner') {
      throw new Error('Test 9 Failed: New organization registration should assign Owner role');
    }
    console.log('  ✅ Test 9 Passed!\n');

    console.log('🎉 ALL 9 END-TO-END TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
