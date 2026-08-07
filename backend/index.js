/**
 * AuctionPro — MERN Stack Node.js Express Backend Server
 * ========================================================
 * Real-time Sports Player Auction Platform Backend (Node.js + Express + MongoDB)
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://adityadiwancse24_db_user:AuctionPro2024@cluster0.ikc0krh.mongodb.net/auctionpro?retryWrites=true&w=majority';
const JWT_SECRET = process.env.JWT_SECRET || 'auctionpro-production-mern-secret-2024';

// ── Security & Input Validation Helpers ──
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, ''); // Strip dangerous HTML tags to prevent XSS
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && re.test(email.trim());
}

// ── File Upload Directory & Static Serving ──
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/api/static/uploads', express.static(UPLOAD_DIR));

// ── Multer Storage Configuration (5MB Limit, Restricted File Types) ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `player_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Strict 5 MB Limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeValid = allowedTypes.test(file.mimetype);
    if (extValid && mimeValid) {
      return cb(null, true);
    }
    cb(new Error('Invalid file format. Only JPG, PNG, WEBP, and GIF images up to 5MB are allowed.'));
  }
});

// ── Middleware ──
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

// ── MongoDB Connection ──
mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ Connected to MongoDB Atlas (MERN Stack)'))
  .catch((err) => console.error('⚠️ MongoDB Connection Warning:', err.message));

// ── Mongoose User Schema ──
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['coordinator', 'player'], default: 'coordinator' },
  phone: { type: String, default: '' },
  mfaEnabled: { type: Boolean, default: false },
  otpCode: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// ── Mongoose Auction Schema ──
const auctionSchema = new mongoose.Schema({
  coordinatorId: { type: String, required: true },
  name: { type: String, required: true },
  sport: { type: String, default: 'Cricket' },
  date: { type: String, required: true },
  basePrice: { type: Number, default: 100000 },
  maxTeams: { type: Number, default: 8 },
  budgetPerTeam: { type: Number, default: 5000000 },
  description: { type: String, default: '' },
  status: { type: String, default: 'upcoming' },
  createdAt: { type: Date, default: Date.now }
});

const Auction = mongoose.model('Auction', auctionSchema);

// ── Mongoose Player Schema ──
const playerSchema = new mongoose.Schema({
  auctionId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Batsman' },
  sport: { type: String, default: 'Cricket' },
  basePrice: { type: Number, default: 100000 },
  city: { type: String, default: '' },
  phone: { type: String, default: '' },
  jerseyNumber: { type: Number, default: 1 },
  battingStyle: { type: String, default: 'Right Hand Batsman' },
  bowlingStyle: { type: String, default: 'Right Arm Medium' },
  age: { type: Number, default: 21 },
  lotNumber: { type: Number, default: 1 },
  bio: { type: String, default: '' },
  photoUrl: { type: String, default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop' },
  status: { type: String, default: 'registered' }, // registered | sold | unsold
  soldToTeamId: { type: String, default: null },
  soldPrice: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Player = mongoose.model('Player', playerSchema);

// ── Mongoose Team Schema ──
const teamSchema = new mongoose.Schema({
  auctionId: { type: String, required: true },
  name: { type: String, required: true },
  ownerName: { type: String, required: true },
  color: { type: String, default: '#FF6B00' },
  purse: { type: Number, default: 5000000 },
  spent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Team = mongoose.model('Team', teamSchema);

// ── Mongoose Payment Schema ──
const paymentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  packageName: { type: String, required: true },
  amount: { type: Number, required: true },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  status: { type: String, default: 'completed' },
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// ── Razorpay Setup ──
const Razorpay = require('razorpay');
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_demo123key';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_demosecret';

let razorpayClient = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } catch (err) {
    console.warn('Razorpay init notice:', err.message);
  }
}

// ── JWT Helper Middleware ──
const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Authorization header required' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.status(401).json({ detail: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid or expired session token' });
  }
};

// ── RBAC Role Middleware Factory ──
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ detail: `Access denied. Requires ${allowedRoles.join(' or ')} role.` });
    }
    next();
  };
};

// ── API ROUTES ──

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', stack: 'MERN (Node.js + Express + MongoDB)', timestamp: new Date().toISOString() });
});

// Secure File Upload Endpoint (Restricted file types, 5MB limit, sanitized filename)
app.post('/api/upload', authMiddleware, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ detail: 'File size exceeds maximum 5 MB limit.' });
      }
      return res.status(400).json({ detail: err.message });
    } else if (err) {
      return res.status(400).json({ detail: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const fileUrl = `/static/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
  });
});

// MERN Auth: Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const name = sanitizeInput(req.body.name);
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    const role = sanitizeInput(req.body.role);
    const phone = sanitizeInput(req.body.phone);

    if (!name || !email || !password) {
      return res.status(400).json({ detail: 'Name, email, and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ detail: 'Invalid email address format' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ detail: 'Password must be at least 6 characters long' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ detail: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'coordinator',
      phone: phone || ''
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const userPublic = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, phone: user.phone };

    res.json({ token, user: userPublic });
  } catch (err) {
    console.error('MERN Register Error:', err);
    res.status(500).json({ detail: 'Registration error: ' + err.message });
  }
});

// MERN Auth: Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ detail: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const userPublic = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, phone: user.phone };

    res.json({ token, user: userPublic });
  } catch (err) {
    console.error('MERN Login Error:', err);
    res.status(500).json({ detail: 'Login error: ' + err.message });
  }
});

// MERN Auth: Get Current User Profile (/api/auth/me)
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const userPublic = { id: req.user._id.toString(), name: req.user.name, email: req.user.email, role: req.user.role, phone: req.user.phone, mfaEnabled: req.user.mfaEnabled };
  res.json(userPublic);
});

// MFA 2FA OTP Code Generation Endpoint
app.post('/api/auth/mfa/generate', authMiddleware, async (req, res) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    req.user.otpCode = otp;
    req.user.otpExpires = expires;
    await req.user.save();

    console.log(`[MFA 2FA] Verification OTP for ${req.user.email}: ${otp}`);
    res.json({ message: '2FA OTP verification code generated', otp_preview: otp });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// MFA 2FA OTP Code Verification Endpoint
app.post('/api/auth/mfa/verify', authMiddleware, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!req.user.otpCode || !req.user.otpExpires) {
      return res.status(400).json({ detail: 'No active OTP verification session. Please request a new code.' });
    }
    if (new Date() > new Date(req.user.otpExpires)) {
      return res.status(400).json({ detail: 'OTP verification code has expired. Please request a new code.' });
    }
    if (req.user.otpCode !== otp) {
      return res.status(400).json({ detail: 'Invalid 6-digit OTP verification code.' });
    }

    req.user.mfaEnabled = true;
    req.user.otpCode = null;
    req.user.otpExpires = null;
    await req.user.save();

    res.json({ status: 'success', message: 'Multi-Factor Authentication (MFA/2FA) successfully enabled!' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Auction Routes
app.get('/api/auctions', async (req, res) => {
  try {
    const auctions = await Auction.find().sort({ createdAt: -1 });
    const formatted = auctions.map(a => ({
      id: a._id.toString(),
      name: a.name,
      sport: a.sport,
      date: a.date,
      base_price: a.basePrice,
      max_teams: a.maxTeams,
      budget_per_team: a.budgetPerTeam,
      description: a.description,
      status: a.status
    }));
    res.json(formatted);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/auctions', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const { name, sport, date, base_price, max_teams, budget_per_team, description } = req.body;
    const auction = new Auction({
      coordinatorId: req.user._id.toString(),
      name,
      sport: sport || 'Cricket',
      date,
      basePrice: base_price || 100000,
      maxTeams: max_teams || 8,
      budgetPerTeam: budget_per_team || 5000000,
      description: description || ''
    });
    await auction.save();
    res.json({
      id: auction._id.toString(),
      name: auction.name,
      sport: auction.sport,
      date: auction.date,
      base_price: auction.basePrice,
      max_teams: auction.maxTeams,
      budget_per_team: auction.budgetPerTeam,
      description: auction.description,
      status: auction.status
    });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

// Resource Ownership Check: Delete Auction (Only creator coordinator can delete)
app.delete('/api/auctions/:id', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ detail: 'Auction not found' });

    // Strict Authorization check: Never trust client-side claims
    if (auction.coordinatorId !== req.user._id.toString()) {
      return res.status(403).json({ detail: 'Access Denied. You can only manage/delete auctions created by your account.' });
    }

    await Auction.findByIdAndDelete(req.params.id);
    res.json({ status: 'success', message: 'Auction deleted successfully' });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Player Routes
app.get('/api/players', async (req, res) => {
  try {
    const { auction_id } = req.query;
    const query = auction_id ? { auctionId: auction_id } : {};
    const players = await Player.find(query);
    const formatted = players.map(p => ({
      id: p._id.toString(),
      auction_id: p.auctionId,
      name: p.name,
      role: p.role,
      sport: p.sport,
      base_price: p.basePrice,
      city: p.city,
      phone: p.phone,
      jersey_number: p.jerseyNumber,
      batting_style: p.battingStyle,
      bowling_style: p.bowlingStyle,
      age: p.age,
      lot_number: p.lotNumber,
      bio: p.bio,
      photo_url: p.photoUrl,
      status: p.status,
      sold_to_team_id: p.soldToTeamId,
      sold_price: p.soldPrice
    }));
    res.json(formatted);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/players', async (req, res) => {
  try {
    const p = req.body;
    const player = new Player({
      auctionId: p.auction_id || 'demo_auction',
      name: p.name,
      role: p.role || 'Batsman',
      sport: p.sport || 'Cricket',
      basePrice: p.base_price || 100000,
      city: p.city || '',
      phone: p.phone || '',
      jerseyNumber: p.jersey_number || 1,
      battingStyle: p.batting_style || 'Right Hand Batsman',
      bowlingStyle: p.bowling_style || 'Right Arm Medium',
      age: p.age || 21,
      lotNumber: p.lot_number || 1,
      bio: p.bio || '',
      photoUrl: p.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop'
    });
    await player.save();
    res.json({
      id: player._id.toString(),
      auction_id: player.auctionId,
      name: player.name,
      role: player.role,
      sport: player.sport,
      base_price: player.basePrice,
      status: player.status
    });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

// Team Routes
app.get('/api/teams', async (req, res) => {
  try {
    const { auction_id } = req.query;
    const query = auction_id ? { auctionId: auction_id } : {};
    const teams = await Team.find(query);
    const formatted = teams.map(t => ({
      id: t._id.toString(),
      auction_id: t.auctionId,
      name: t.name,
      owner_name: t.ownerName,
      color: t.color,
      purse: t.purse,
      spent: t.spent
    }));
    res.json(formatted);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/teams', async (req, res) => {
  try {
    const t = req.body;
    const team = new Team({
      auctionId: t.auction_id,
      name: t.name,
      ownerName: t.owner_name,
      color: t.color || '#FF6B00',
      purse: t.purse || 5000000
    });
    await team.save();
    res.json({
      id: team._id.toString(),
      auction_id: team.auctionId,
      name: team.name,
      owner_name: team.ownerName,
      color: team.color,
      purse: team.purse,
      spent: team.spent
    });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

// Payment Routes
app.post('/api/checkout', authMiddleware, async (req, res) => {
  try {
    const { package_name, amount } = req.body;

    if (razorpayClient) {
      const order = await razorpayClient.orders.create({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`
      });
      return res.json({
        order_id: order.id,
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        package_name
      });
    }

    // Mock Razorpay Order for testing/development mode
    res.json({
      order_id: 'order_demo_' + Date.now(),
      key_id: RAZORPAY_KEY_ID,
      amount: Math.round(amount * 100),
      currency: 'INR',
      package_name
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ detail: 'Checkout failed: ' + err.message });
  }
});

app.post('/api/payment/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, package_name, amount } = req.body;
    const payment = new Payment({
      userId: req.user._id.toString(),
      packageName: package_name,
      amount: amount || 0,
      razorpayOrderId: razorpay_order_id || 'demo_order',
      razorpayPaymentId: razorpay_payment_id || 'demo_payment',
      status: 'completed'
    });
    await payment.save();
    res.json({ status: 'success', message: `${package_name} package activated successfully!` });
  } catch (err) {
    res.status(400).json({ detail: err.message });
  }
});

app.get('/api/payments', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id.toString() }).sort({ createdAt: -1 });
    const formatted = payments.map(p => ({
      id: p._id.toString(),
      package_name: p.packageName,
      amount: p.amount,
      status: p.status,
      created_at: p.createdAt.toISOString()
    }));
    res.json(formatted);
  } catch (err) {
    res.json([]);
  }
});

// Socket.IO Real-time bidding
io.on('connection', (socket) => {
  console.log('⚡ Socket client connected:', socket.id);

  socket.on('join_auction', ({ auction_id }) => {
    socket.join(auction_id);
  });

  socket.on('place_bid', (data) => {
    io.to(data.auction_id).emit('new_bid', data);
  });

  socket.on('player_sold', (data) => {
    io.to(data.auction_id).emit('player_sold', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MERN Stack Node.js Express server running on port ${PORT}`);
});
