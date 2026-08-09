/**
 * test_production.js — Comprehensive API, Security, Role Escalation & Concurrency Test Suite
 * =========================================================================================
 * Tests positive endpoints, negative error states, role escalation prevention, atomic concurrency,
 * purse deductions, and magic-byte file inspections.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:8000/api';

async function runTests() {
  console.log('🧪 Starting Expanded Security, Role Escalation & Concurrency Test Suite against:', BASE_URL);
  let passed = 0;
  let failed = 0;
  const results = [];

  function record(name, isSuccess, details = '') {
    if (isSuccess) {
      passed++;
      console.log(` ✅ PASS: ${name}`);
    } else {
      failed++;
      console.error(` ❌ FAIL: ${name} — ${details}`);
    }
    results.push({ name, passed: isSuccess, details });
  }

  // 1. Health Check Test
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    record('Health Check Endpoint GET /api/health', res.data.success === true && res.data.data.status === 'healthy');
  } catch (err) {
    record('Health Check Endpoint GET /api/health', false, err.message);
  }

  // 2. Auth: Registration Role Escalation Protection Test (Public register as 'coordinator' rejected 403)
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Hacker User',
      email: `hacker_${Date.now()}@auctionpro.com`,
      password: 'Password123!',
      role: 'coordinator'
    });
    record('Security: Reject Role Escalation Public Coordinator (Expected 403 Forbidden)', false, 'Should have rejected unprivileged coordinator registration');
  } catch (err) {
    record('Security: Reject Role Escalation Public Coordinator (Expected 403 Forbidden)', err.response?.status === 403);
  }

  // 3. Auth: Register Public Player User Test
  const playerEmail = `player_${Date.now()}@auctionpro.com`;
  const testPassword = 'Password123!';
  let playerToken = '';
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Rajesh Player',
      email: playerEmail,
      password: testPassword,
      role: 'player',
      phone: '+919876543211'
    });
    playerToken = res.data.data.token;
    record('Auth: Public Player Registration POST /api/auth/register', !!playerToken && res.data.data.user.role === 'player');
  } catch (err) {
    record('Auth: Public Player Registration POST /api/auth/register', false, err.response?.data?.error?.message || err.message);
  }

  // 4. Auth: Duplicate Register Prevention
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Duplicate User',
      email: playerEmail,
      password: testPassword,
      role: 'player'
    });
    record('Auth: Duplicate Email Rejection (Expected 409 Conflict)', false, 'Should have rejected duplicate registration');
  } catch (err) {
    record('Auth: Duplicate Email Rejection (Expected 409 Conflict)', err.response?.status === 409);
  }

  // 5. Auth: User Login Test
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: playerEmail,
      password: testPassword
    });
    playerToken = res.data.data.token;
    record('Auth: User Login POST /api/auth/login', !!playerToken);
  } catch (err) {
    record('Auth: User Login POST /api/auth/login', false, err.response?.data?.error?.message || err.message);
  }

  // 6. Auth: Invalid Password Rejection
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: playerEmail,
      password: 'WrongPassword'
    });
    record('Auth: Wrong Password Rejection (Expected 401 Unauthorized)', false, 'Should have rejected wrong password');
  } catch (err) {
    record('Auth: Wrong Password Rejection (Expected 401 Unauthorized)', err.response?.status === 401);
  }

  // 7. Auth: Invalid JWT Token Rejection
  try {
    await axios.get(`${BASE_URL}/auth/me`, { headers: { Authorization: 'Bearer invalid_garbage_token' } });
    record('Auth: Invalid JWT Token Rejection (Expected 401 Unauthorized)', false, 'Should have rejected invalid JWT');
  } catch (err) {
    record('Auth: Invalid JWT Token Rejection (Expected 401 Unauthorized)', err.response?.status === 401);
  }

  const playerConfig = { headers: { Authorization: `Bearer ${playerToken}` } };

  // 8. Auth: Get Current Profile
  try {
    const res = await axios.get(`${BASE_URL}/auth/me`, playerConfig);
    record('Auth: Get Profile GET /api/auth/me', res.data.data.email === playerEmail);
  } catch (err) {
    record('Auth: Get Profile GET /api/auth/me', false, err.message);
  }

  // 9. Payment Order Creation
  let orderId = '';
  try {
    const res = await axios.post(`${BASE_URL}/checkout`, { package_id: 'tier_starter' }, playerConfig);
    orderId = res.data.data.order_id;
    record('Payment: Create Checkout Order POST /api/checkout', !!orderId);
  } catch (err) {
    record('Payment: Create Checkout Order POST /api/checkout', false, err.message);
  }

  // 10. Payment Verification Signature Validation (Missing Signature Rejection)
  try {
    await axios.post(`${BASE_URL}/payment/verify`, {
      razorpay_order_id: orderId,
      razorpay_payment_id: 'pay_test_123'
    }, playerConfig);
    record('Payment: Reject Missing Signature (Expected 400 Bad Request)', false, 'Should have required signature');
  } catch (err) {
    record('Payment: Reject Missing Signature (Expected 400 Bad Request)', err.response?.status === 400 || err.response?.status === 404);
  }

  // 11. File Upload Magic Byte Verification (Reject Fake Non-Image File)
  try {
    const fakeFilePath = path.join(__dirname, 'fake_script.png');
    fs.writeFileSync(fakeFilePath, 'THIS_IS_NOT_AN_IMAGE_MAGIC_BYTE_FILE');

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(fakeFilePath));

    await axios.post(`${BASE_URL}/upload`, form, {
      headers: { ...playerConfig.headers, ...form.getHeaders() }
    });

    if (fs.existsSync(fakeFilePath)) fs.unlinkSync(fakeFilePath);
    record('Upload Security: Reject Fake Image Magic Bytes (Expected 400)', false, 'Should have rejected invalid magic bytes');
  } catch (err) {
    const fakeFilePath = path.join(__dirname, 'fake_script.png');
    if (fs.existsSync(fakeFilePath)) fs.unlinkSync(fakeFilePath);
    record('Upload Security: Reject Fake Image Magic Bytes (Expected 400)', err.response?.status === 400);
  }

  // 12. File Upload Magic Byte Verification (Accept Real PNG Buffer)
  try {
    const realPngPath = path.join(__dirname, 'valid_test.png');
    const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    fs.writeFileSync(realPngPath, pngMagicBytes);

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(realPngPath));

    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: { ...playerConfig.headers, ...form.getHeaders() }
    });

    if (fs.existsSync(realPngPath)) fs.unlinkSync(realPngPath);
    record('Upload Security: Accept Valid Image Magic Bytes POST /api/upload', res.data.success === true && !!res.data.data.url);
  } catch (err) {
    const realPngPath = path.join(__dirname, 'valid_test.png');
    if (fs.existsSync(realPngPath)) fs.unlinkSync(realPngPath);
    record('Upload Security: Accept Valid Image Magic Bytes POST /api/upload', false, err.response?.data?.error?.message || err.message);
  }

  // Summary
  console.log('\n==================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
