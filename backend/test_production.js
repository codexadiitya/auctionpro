/**
 * test_production.js — Comprehensive API, Security, Role Escalation & 50-Client Concurrency Stress Test Suite
 * =========================================================================================================
 * Tests positive endpoints, negative error states, role escalation prevention, atomic concurrency under 50 simultaneous bids,
 * purse deductions, and magic-byte file inspections.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:8000/api';

async function runTests() {
  console.log('🧪 Starting Expanded Security, Role Escalation & 50-Client Concurrency Stress Test Suite against:', BASE_URL);
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

  // 2. Auth: Registration Role Escalation Protection Test (Public register as 'coordinator' rejected)
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

  // 3. Auth: Register Authorized Coordinator Test
  const coordEmail = `coord_${Date.now()}@auctionpro.com`;
  const testPassword = 'Password123!';
  let coordToken = '';

  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Aditya Coordinator',
      email: coordEmail,
      password: testPassword,
      role: 'coordinator',
      admin_key: 'auctionpro_admin_secret_2026',
      phone: '+919876543210'
    });
    coordToken = res.data.data.token;
    record('Auth: Authorized Coordinator Registration POST /api/auth/register', !!coordToken && res.data.data.user.role === 'coordinator');
  } catch (err) {
    record('Auth: Authorized Coordinator Registration POST /api/auth/register', false, err.response?.data?.error?.message || err.message);
  }

  // 4. Auth: Register Public Player User Test
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
    record('Auth: Public Player Registration POST /api/auth/register', !!playerToken && res.data.data.user.role === 'player');
  } catch (err) {
    record('Auth: Public Player Registration POST /api/auth/register', false, err.response?.data?.error?.message || err.message);
  }

  // 5. Auth: Duplicate Register Prevention
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Duplicate User',
      email: coordEmail,
      password: testPassword,
      role: 'player'
    });
    record('Auth: Duplicate Email Rejection (Expected 409 Conflict)', false, 'Should have rejected duplicate registration');
  } catch (err) {
    record('Auth: Duplicate Email Rejection (Expected 409 Conflict)', err.response?.status === 409);
  }

  // 6. Auth: User Login Test
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

  // 7. Auth: Invalid Password Rejection
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: coordEmail,
      password: 'WrongPassword'
    });
    record('Auth: Wrong Password Rejection (Expected 401 Unauthorized)', false, 'Should have rejected wrong password');
  } catch (err) {
    record('Auth: Wrong Password Rejection (Expected 401 Unauthorized)', err.response?.status === 401);
  }

  // 8. Auth: Invalid JWT Token Rejection
  try {
    await axios.get(`${BASE_URL}/auth/me`, { headers: { Authorization: 'Bearer invalid_garbage_token' } });
    record('Auth: Invalid JWT Token Rejection (Expected 401 Unauthorized)', false, 'Should have rejected invalid JWT');
  } catch (err) {
    record('Auth: Invalid JWT Token Rejection (Expected 401 Unauthorized)', err.response?.status === 401);
  }

  const coordConfig = { headers: { Authorization: `Bearer ${coordToken}` } };
  const playerConfig = { headers: { Authorization: `Bearer ${playerToken}` } };

  // 9. Auth: Get Current Profile
  try {
    const res = await axios.get(`${BASE_URL}/auth/me`, coordConfig);
    record('Auth: Get Profile GET /api/auth/me', res.data.data.email === coordEmail);
  } catch (err) {
    record('Auth: Get Profile GET /api/auth/me', false, err.message);
  }

  // 10. Create Auction Test
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

  // 11. Add Teams Test (Team 1 & Team 2)
  let team1Id = '';
  let team2Id = '';
  try {
    const res1 = await axios.post(`${BASE_URL}/teams`, {
      auction_id: auctionId,
      name: 'Mumbai Titans',
      owner_name: 'Aditya Coordinator',
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

  // 15. 50-Client Simultaneous Bidding Concurrency Stress Test
  try {
    console.log('  ⚡ Launching 50 Simultaneous Bids Stress Test...');
    const stressPromises = [];
    for (let i = 1; i <= 50; i++) {
      const bidAmt = 2500000 + i * 100000; // Incrementing bid amounts
      stressPromises.push(
        axios.post(`${BASE_URL}/bids`, {
          auction_id: auctionId,
          player_id: playerId,
          team_id: team1Id,
          amount: bidAmt
        }, coordConfig).catch(e => e.response)
      );
    }
    const stressResults = await Promise.all(stressPromises);
    const successfulBids = stressResults.filter(r => r && r.data && r.data.success === true);
    
    // Verify highest bid in auction
    const finalAuctionRes = await axios.get(`${BASE_URL}/auctions/${auctionId}`);
    const highestBidAmt = finalAuctionRes.data.data.current_bid;

    record('Bidding Engine: 50-Client Simultaneous Bidding Stress Test', successfulBids.length > 0 && highestBidAmt >= 7500000);
  } catch (err) {
    record('Bidding Engine: 50-Client Simultaneous Bidding Stress Test', false, err.message);
  }

  // 16. Mark Player Sold & Deduct Purse Test
  try {
    const finalAuctionRes = await axios.get(`${BASE_URL}/auctions/${auctionId}`);
    const finalBid = finalAuctionRes.data.data.current_bid || 7500000;

    const res = await axios.post(`${BASE_URL}/auction/sold`, {
      auction_id: auctionId,
      player_id: playerId,
      team_id: team1Id,
      price: finalBid
    }, coordConfig);
    record('Auction Engine: Mark Player Sold POST /api/auction/sold', res.data.data.player.status === 'sold' && res.data.data.team.spent === finalBid);
  } catch (err) {
    record('Auction Engine: Mark Player Sold POST /api/auction/sold', false, err.response?.data?.error?.message || err.message);
  }

  // 17. 10-Client Simultaneous SOLD Stress Test (Duplicate Sale Prevention)
  try {
    console.log('  ⚡ Launching 10 Simultaneous SOLD Requests Stress Test...');
    const soldPromises = [];
    for (let i = 0; i < 10; i++) {
      soldPromises.push(
        axios.post(`${BASE_URL}/auction/sold`, {
          auction_id: auctionId,
          player_id: playerId,
          team_id: team1Id,
          price: 5000000
        }, coordConfig).catch(e => e.response)
      );
    }
    const soldResults = await Promise.all(soldPromises);
    const conflicts = soldResults.filter(r => r && r.status === 409);
    record('Auction Engine: 10-Client Simultaneous SOLD Stress Test (All Rejected 409)', conflicts.length === 10);
  } catch (err) {
    record('Auction Engine: 10-Client Simultaneous SOLD Stress Test (All Rejected 409)', false, err.message);
  }

  // 18. File Upload Magic Byte Verification (Reject Fake File)
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
