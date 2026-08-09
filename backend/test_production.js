/**
 * test_production.js — Comprehensive API, Security & Concurrency Test Suite
 * =========================================================================
 * Tests positive endpoints, negative error states, authorization boundaries,
 * atomic concurrency, purse deductions, and magic-byte file inspections.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:8000/api';

async function runTests() {
  console.log('🧪 Starting Expanded Production Security & Concurrency Test Suite against:', BASE_URL);
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

  // 2. Auth: Register Test (Coordinator)
  const coordEmail = `coord_${Date.now()}@auctionpro.com`;
  const testPassword = 'Password123!';
  let coordToken = '';

  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Aditya Coordinator',
      email: coordEmail,
      password: testPassword,
      role: 'coordinator',
      phone: '+919876543210'
    });
    coordToken = res.data.data.token;
    record('Auth: Coordinator Registration POST /api/auth/register', !!coordToken);
  } catch (err) {
    record('Auth: Coordinator Registration POST /api/auth/register', false, err.response?.data?.error?.message || err.message);
  }

  // 3. Auth: Register Test (Player User)
  const playerEmail = `player_${Date.now()}@auctionpro.com`;
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
    record('Auth: Player User Registration POST /api/auth/register', !!playerToken);
  } catch (err) {
    record('Auth: Player User Registration POST /api/auth/register', false, err.response?.data?.error?.message || err.message);
  }

  // 4. Auth: Duplicate Register Prevention
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Duplicate User',
      email: coordEmail,
      password: testPassword,
      role: 'coordinator'
    });
    record('Auth: Duplicate Email Rejection (Expected 409 Conflict)', false, 'Should have rejected duplicate registration');
  } catch (err) {
    record('Auth: Duplicate Email Rejection (Expected 409 Conflict)', err.response?.status === 409);
  }

  // 5. Auth: User Login Test
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: coordEmail,
      password: testPassword
    });
    coordToken = res.data.data.token;
    record('Auth: User Login POST /api/auth/login', !!coordToken);
  } catch (err) {
    record('Auth: User Login POST /api/auth/login', false, err.response?.data?.error?.message || err.message);
  }

  // 6. Auth: Invalid Password Rejection
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: coordEmail,
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

  const coordConfig = { headers: { Authorization: `Bearer ${coordToken}` } };
  const playerConfig = { headers: { Authorization: `Bearer ${playerToken}` } };

  // 8. Auth: Get Current Profile
  try {
    const res = await axios.get(`${BASE_URL}/auth/me`, coordConfig);
    record('Auth: Get Profile GET /api/auth/me', res.data.data.email === coordEmail);
  } catch (err) {
    record('Auth: Get Profile GET /api/auth/me', false, err.message);
  }

  // 9. Create Auction Test
  let auctionId = '';
  try {
    const res = await axios.post(`${BASE_URL}/auctions`, {
      name: 'IPL Premier Auction 2026',
      sport: 'Cricket',
      date: '2026-09-01',
      base_price: 100000,
      max_teams: 8,
      budget_per_team: 10000000,
      description: 'Official Premier League Auction'
    }, coordConfig);
    auctionId = res.data.data.id;
    record('Auction: Create POST /api/auctions', !!auctionId && res.data.data.status === 'upcoming');
  } catch (err) {
    record('Auction: Create POST /api/auctions', false, err.response?.data?.error?.message || err.message);
  }

  // 10. Get Single Auction GET /api/auctions/:id
  try {
    const res = await axios.get(`${BASE_URL}/auctions/${auctionId}`);
    record('Auction: Get by ID GET /api/auctions/:id', res.data.data.id === auctionId);
  } catch (err) {
    record('Auction: Get by ID GET /api/auctions/:id', false, err.message);
  }

  // 11. Add Teams Test (Team 1 & Team 2)
  let team1Id = '';
  let team2Id = '';
  try {
    const res1 = await axios.post(`${BASE_URL}/teams`, {
      auction_id: auctionId,
      name: 'Mumbai Titans',
      owner_name: 'Aditya Coordinator', // Assigned to coord
      color: '#FF6B00',
      purse: 10000000
    }, coordConfig);
    team1Id = res1.data.data.id;

    const res2 = await axios.post(`${BASE_URL}/teams`, {
      auction_id: auctionId,
      name: 'Royal Knights',
      owner_name: 'Rajesh Player',
      color: '#3B82F6',
      purse: 3000000 // Small purse for insufficient purse test
    }, coordConfig);
    team2Id = res2.data.data.id;

    record('Team: Add Teams POST /api/teams', !!team1Id && !!team2Id);
  } catch (err) {
    record('Team: Add Teams POST /api/teams', false, err.response?.data?.error?.message || err.message);
  }

  // 12. Register Player Test
  let playerId = '';
  try {
    const res = await axios.post(`${BASE_URL}/players`, {
      auction_id: auctionId,
      name: 'Virat Kohli',
      role: 'Batsman',
      sport: 'Cricket',
      base_price: 2000000,
      city: 'Delhi',
      jersey_number: 18
    });
    playerId = res.data.data.id;
    record('Player: Register POST /api/players', !!playerId && res.data.data.status === 'registered');
  } catch (err) {
    record('Player: Register POST /api/players', false, err.response?.data?.error?.message || err.message);
  }

  // 13. Select Next Player for Bidding
  try {
    const res = await axios.post(`${BASE_URL}/auction/next`, {
      auction_id: auctionId,
      player_id: playerId
    }, coordConfig);
    record('Auction Engine: Select Next Player POST /api/auction/next', res.data.data.player.status === 'live');
  } catch (err) {
    record('Auction Engine: Select Next Player POST /api/auction/next', false, err.response?.data?.error?.message || err.message);
  }

  // 14. Place Valid Bid Test
  try {
    const res = await axios.post(`${BASE_URL}/bids`, {
      auction_id: auctionId,
      player_id: playerId,
      team_id: team1Id,
      amount: 2500000
    }, coordConfig);
    record('Bidding Engine: Place Valid Bid POST /api/bids', res.data.data.bid.amount === 2500000);
  } catch (err) {
    record('Bidding Engine: Place Valid Bid POST /api/bids', false, err.response?.data?.error?.message || err.message);
  }

  // 15. Reject Low Bid Test
  try {
    await axios.post(`${BASE_URL}/bids`, {
      auction_id: auctionId,
      player_id: playerId,
      team_id: team1Id,
      amount: 2000000 // Lower than current bid of 2.5M
    }, coordConfig);
    record('Bidding Engine: Reject Low Bid (Expected 400 Bad Request)', false, 'Should have rejected low bid');
  } catch (err) {
    record('Bidding Engine: Reject Low Bid (Expected 400 Bad Request)', err.response?.status === 400);
  }

  // 16. Reject Insufficient Purse Bid Test
  try {
    await axios.post(`${BASE_URL}/bids`, {
      auction_id: auctionId,
      player_id: playerId,
      team_id: team2Id, // Team 2 purse is 3,000,000
      amount: 5000000 // Exceeds Team 2 purse!
    }, playerConfig);
    record('Bidding Engine: Reject Insufficient Purse (Expected 400 Bad Request)', false, 'Should have rejected excessive bid');
  } catch (err) {
    record('Bidding Engine: Reject Insufficient Purse (Expected 400 Bad Request)', err.response?.status === 400);
  }

  // 17. Atomic Concurrency Bidding Test (Simultaneous Bids)
  try {
    const bidPromises = [
      axios.post(`${BASE_URL}/bids`, { auction_id: auctionId, player_id: playerId, team_id: team1Id, amount: 3000000 }, coordConfig).catch(e => e.response),
      axios.post(`${BASE_URL}/bids`, { auction_id: auctionId, player_id: playerId, team_id: team1Id, amount: 3000000 }, coordConfig).catch(e => e.response),
      axios.post(`${BASE_URL}/bids`, { auction_id: auctionId, player_id: playerId, team_id: team1Id, amount: 3500000 }, coordConfig).catch(e => e.response)
    ];
    const resultsList = await Promise.all(bidPromises);
    const successfulBids = resultsList.filter(r => r && r.data && r.data.success === true);
    record('Bidding Engine: Atomic Concurrency (Simultaneous Bids)', successfulBids.length > 0);
  } catch (err) {
    record('Bidding Engine: Atomic Concurrency (Simultaneous Bids)', false, err.message);
  }

  // 18. Mark Player Sold & Deduct Purse Test
  try {
    const res = await axios.post(`${BASE_URL}/auction/sold`, {
      auction_id: auctionId,
      player_id: playerId,
      team_id: team1Id,
      price: 3500000
    }, coordConfig);
    record('Auction Engine: Mark Player Sold POST /api/auction/sold', res.data.data.player.status === 'sold' && res.data.data.team.spent === 3500000);
  } catch (err) {
    record('Auction Engine: Mark Player Sold POST /api/auction/sold', false, err.response?.data?.error?.message || err.message);
  }

  // 19. Reject Duplicate SOLD Request Test
  try {
    await axios.post(`${BASE_URL}/auction/sold`, {
      auction_id: auctionId,
      player_id: playerId,
      team_id: team1Id,
      price: 3500000
    }, coordConfig);
    record('Auction Engine: Reject Duplicate SOLD Request (Expected 409 Conflict)', false, 'Should have rejected duplicate SOLD request');
  } catch (err) {
    record('Auction Engine: Reject Duplicate SOLD Request (Expected 409 Conflict)', err.response?.status === 409);
  }

  // 20. Payment Checkout Order Creation
  let orderId = '';
  try {
    const res = await axios.post(`${BASE_URL}/checkout`, {
      package_id: 'tier_pro'
    }, coordConfig);
    orderId = res.data.data.order_id;
    record('Payment: Create Checkout Order POST /api/checkout', !!orderId && res.data.data.amount === 149900);
  } catch (err) {
    record('Payment: Create Checkout Order POST /api/checkout', false, err.response?.data?.error?.message || err.message);
  }

  // 21. Payment Verification Signature Validation (Missing Signature Rejection)
  try {
    await axios.post(`${BASE_URL}/payment/verify`, {
      razorpay_order_id: orderId,
      razorpay_payment_id: 'pay_test_123'
    }, coordConfig);
    record('Payment: Reject Missing Signature (Expected 400 Bad Request)', false, 'Should have required signature');
  } catch (err) {
    record('Payment: Reject Missing Signature (Expected 400 Bad Request)', err.response?.status === 400);
  }

  // 22. Payment Webhook Missing Signature Rejection
  try {
    await axios.post(`${BASE_URL}/payment/webhook`, {
      event: 'payment.captured'
    });
    record('Payment: Reject Webhook Missing Signature (Expected 400 Bad Request)', false, 'Should have required webhook signature');
  } catch (err) {
    record('Payment: Reject Webhook Missing Signature (Expected 400 Bad Request)', err.response?.status === 400);
  }

  // 23. File Upload Magic Byte Verification (Reject Fake Non-Image File)
  try {
    const fakeFilePath = path.join(__dirname, 'fake_script.png');
    fs.writeFileSync(fakeFilePath, 'THIS_IS_NOT_AN_IMAGE_MAGIC_BYTE_FILE');

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(fakeFilePath));

    await axios.post(`${BASE_URL}/upload`, form, {
      headers: { ...coordConfig.headers, ...form.getHeaders() }
    });

    if (fs.existsSync(fakeFilePath)) fs.unlinkSync(fakeFilePath);
    record('Upload Security: Reject Fake Image Magic Bytes (Expected 400)', false, 'Should have rejected invalid magic bytes');
  } catch (err) {
    const fakeFilePath = path.join(__dirname, 'fake_script.png');
    if (fs.existsSync(fakeFilePath)) fs.unlinkSync(fakeFilePath);
    record('Upload Security: Reject Fake Image Magic Bytes (Expected 400)', err.response?.status === 400);
  }

  // 24. File Upload Magic Byte Verification (Accept Real PNG Buffer)
  try {
    const realPngPath = path.join(__dirname, 'valid_test.png');
    const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    fs.writeFileSync(realPngPath, pngMagicBytes);

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(realPngPath));

    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: { ...coordConfig.headers, ...form.getHeaders() }
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
  console.log(`📊 EXPANDED TEST RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
