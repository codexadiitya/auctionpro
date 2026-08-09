/**
 * test_production.js — Comprehensive API & Integration Automated Test Suite
 * =========================================================================
 * Tests all production endpoints, auth, RBAC, bidding engine, purse logic, and payments.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:8000/api';

async function runTests() {
  console.log('🧪 Starting Automated Production API Test Suite against:', BASE_URL);
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

  // 2. Auth: Register Test
  const testEmail = `coordinator_${Date.now()}@auctionpro.com`;
  const testPassword = 'Password123!';
  let token = '';
  let coordinatorId = '';

  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test Coordinator',
      email: testEmail,
      password: testPassword,
      role: 'coordinator',
      phone: '+919876543210'
    });
    token = res.data.data.token;
    coordinatorId = res.data.data.user.id;
    record('Auth: User Registration POST /api/auth/register', !!token && res.data.data.user.role === 'coordinator');
  } catch (err) {
    record('Auth: User Registration POST /api/auth/register', false, err.response?.data?.error?.message || err.message);
  }

  // 3. Auth: Duplicate Register Prevention
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Duplicate User',
      email: testEmail,
      password: testPassword,
      role: 'coordinator'
    });
    record('Auth: Duplicate Email Rejection (Expected 409 Conflict)', false, 'Should have rejected duplicate registration');
  } catch (err) {
    record('Auth: Duplicate Email Rejection (Expected 409 Conflict)', err.response?.status === 409);
  }

  // 4. Auth: Login Test
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    token = res.data.data.token;
    record('Auth: User Login POST /api/auth/login', !!token);
  } catch (err) {
    record('Auth: User Login POST /api/auth/login', false, err.response?.data?.error?.message || err.message);
  }

  // 5. Auth: Invalid Password Rejection
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: 'WrongPassword'
    });
    record('Auth: Wrong Password Rejection (Expected 401 Unauthorized)', false, 'Should have rejected wrong password');
  } catch (err) {
    record('Auth: Wrong Password Rejection (Expected 401 Unauthorized)', err.response?.status === 401);
  }

  // Auth Header Config for Protected Calls
  const authConfig = { headers: { Authorization: `Bearer ${token}` } };

  // 6. Auth: Current Profile GET /api/auth/me
  try {
    const res = await axios.get(`${BASE_URL}/auth/me`, authConfig);
    record('Auth: Get Profile GET /api/auth/me', res.data.data.email === testEmail);
  } catch (err) {
    record('Auth: Get Profile GET /api/auth/me', false, err.message);
  }

  // 7. Stats Endpoint Test
  try {
    const res = await axios.get(`${BASE_URL}/stats`, authConfig);
    record('Dashboard Stats GET /api/stats', typeof res.data.data.total_auctions === 'number');
  } catch (err) {
    record('Dashboard Stats GET /api/stats', false, err.message);
  }

  // 8. Create Auction Test
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
    }, authConfig);
    auctionId = res.data.data.id;
    record('Auction: Create POST /api/auctions', !!auctionId && res.data.data.status === 'upcoming');
  } catch (err) {
    record('Auction: Create POST /api/auctions', false, err.response?.data?.error?.message || err.message);
  }

  // 9. Get Single Auction GET /api/auctions/:id
  try {
    const res = await axios.get(`${BASE_URL}/auctions/${auctionId}`);
    record('Auction: Get by ID GET /api/auctions/:id', res.data.data.id === auctionId);
  } catch (err) {
    record('Auction: Get by ID GET /api/auctions/:id', false, err.message);
  }

  // 10. Add Team Test
  let teamId = '';
  try {
    const res = await axios.post(`${BASE_URL}/teams`, {
      auction_id: auctionId,
      name: 'Mumbai Titans',
      owner_name: 'Aditya Diwan',
      color: '#FF6B00',
      purse: 10000000
    }, authConfig);
    teamId = res.data.data.id;
    record('Team: Add POST /api/teams', !!teamId && res.data.data.purse === 10000000);
  } catch (err) {
    record('Team: Add POST /api/teams', false, err.response?.data?.error?.message || err.message);
  }

  // 11. Add Player Test
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

  // 12. Select Next Player for Bidding
  try {
    const res = await axios.post(`${BASE_URL}/auction/next`, {
      auction_id: auctionId,
      player_id: playerId
    }, authConfig);
    record('Auction Engine: Select Next Player POST /api/auction/next', res.data.data.player.status === 'live');
  } catch (err) {
    record('Auction Engine: Select Next Player POST /api/auction/next', false, err.response?.data?.error?.message || err.message);
  }

  // 13. Place Bid Test (Server-Authoritative Validation)
  try {
    const res = await axios.post(`${BASE_URL}/bids`, {
      auction_id: auctionId,
      player_id: playerId,
      team_id: teamId,
      amount: 2500000
    }, authConfig);
    record('Bidding Engine: Place Bid POST /api/bids', res.data.data.bid.amount === 2500000);
  } catch (err) {
    record('Bidding Engine: Place Bid POST /api/bids', false, err.response?.data?.error?.message || err.message);
  }

  // 14. Place Low Bid Rejection Test
  try {
    await axios.post(`${BASE_URL}/bids`, {
      auction_id: auctionId,
      player_id: playerId,
      team_id: teamId,
      amount: 2000000 // Lower than current bid of 2.5M
    }, authConfig);
    record('Bidding Engine: Reject Low Bid (Expected 400)', false, 'Should have rejected lower bid');
  } catch (err) {
    record('Bidding Engine: Reject Low Bid (Expected 400)', err.response?.status === 400);
  }

  // 15. Mark Player Sold & Deduct Purse
  try {
    const res = await axios.post(`${BASE_URL}/auction/sold`, {
      auction_id: auctionId,
      player_id: playerId,
      team_id: teamId,
      price: 2500000
    }, authConfig);
    record('Auction Engine: Mark Player Sold POST /api/auction/sold', res.data.data.player.status === 'sold' && res.data.data.team.spent === 2500000);
  } catch (err) {
    record('Auction Engine: Mark Player Sold POST /api/auction/sold', false, err.response?.data?.error?.message || err.message);
  }

  // 16. Razorpay Checkout Order Creation
  let orderId = '';
  try {
    const res = await axios.post(`${BASE_URL}/checkout`, {
      package_id: '4 Teams'
    }, authConfig);
    orderId = res.data.data.order_id;
    record('Payment: Create Checkout Order POST /api/checkout', !!orderId && res.data.data.amount === 199900);
  } catch (err) {
    record('Payment: Create Checkout Order POST /api/checkout', false, err.response?.data?.error?.message || err.message);
  }

  // 17. Razorpay Payment Verification
  try {
    const res = await axios.post(`${BASE_URL}/payment/verify`, {
      razorpay_order_id: orderId,
      razorpay_payment_id: 'pay_test_' + Date.now(),
      package_name: '4 Teams Package'
    }, authConfig);
    record('Payment: Verify Payment POST /api/payment/verify', res.data.success === true);
  } catch (err) {
    record('Payment: Verify Payment POST /api/payment/verify', false, err.response?.data?.error?.message || err.message);
  }

  // 18. Payment History GET /api/payments
  try {
    const res = await axios.get(`${BASE_URL}/payments`, authConfig);
    record('Payment: List History GET /api/payments', Array.isArray(res.data.data) && res.data.data.length > 0);
  } catch (err) {
    record('Payment: List History GET /api/payments', false, err.message);
  }

  // Summary
  console.log('\n==================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run test suite if executed directly
if (require.main === module) {
  runTests();
}
