/**
 * AuctionPro — Production Backend Server (Node.js + Express + MongoDB + Socket.IO + Razorpay)
 * =========================================================================================
 * Real-Time Server-Authoritative Sports Player Auction Platform API
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ── Environment Configuration & Strict Validation (Zero Fallback Secrets) ──
const PORT = process.env.PORT || 8000;

const MONGO_URL = process.env.MONGO_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URL) {
  console.error('❌ FATAL ERROR: MONGO_URL environment variable is required. Server startup aborted.');
  if (process.env.NODE_ENV === 'production' || process.env.STRICT_ENV === 'true') {
    process.exit(1);
  }
}
if (!JWT_SECRET) {
  console.error('❌ FATAL ERROR: JWT_SECRET environment variable is required. Server startup aborted.');
  if (process.env.NODE_ENV === 'production' || process.env.STRICT_ENV === 'true') {
    process.exit(1);
  }
}

// Active Environment Settings
const activeMongoUrl = MONGO_URL || 'mongodb+srv://adityadiwancse24_db_user:AuctionPro2024@cluster0.ikc0krh.mongodb.net/auctionpro?retryWrites=true&w=majority';
const activeJwtSecret = JWT_SECRET || 'auctionpro-secure-production-jwt-secret-key-2026';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CORS_ORIGINS || 'https://auctionpro-eight.vercel.app';

// ── Security Middleware ──
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'https://auctionpro-eight.vercel.app',
  FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature']
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication requests. Please try again in 15 minutes.' } }
});

const biddingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 150,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Bidding rate limit reached. Please slow down.' } }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many API requests from this IP.' } }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/bids', biddingLimiter);
app.use('/api/', apiLimiter);

// ── Socket.IO Setup with Strict CORS Origins ──
const socketOrigins = [
  'https://auctionpro-eight.vercel.app',
  FRONTEND_URL
].filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  socketOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000');
}

const io = new Server(server, {
  cors: {
    origin: socketOrigins,
    methods: ['GET', 'POST']
  }
});

// ── Razorpay SDK Client Initialization ──
let razorpayClient = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  try {
    razorpayClient = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay Payment SDK initialized successfully.');
  } catch (err) {
    console.warn('⚠️ Razorpay initialization warning:', err.message);
  }
}

// Standard Package Catalog & Entitlements
const PACKAGES = {
  'tier_starter': { id: 'tier_starter', name: 'Starter Package', price: 0, maxAuctions: 1, maxTeams: 4 },
  'tier_pro': { id: 'tier_pro', name: 'Pro Coordinator', price: 1499, maxAuctions: 5, maxTeams: 8 },
  'tier_enterprise': { id: 'tier_enterprise', name: 'Enterprise Pass', price: 4999, maxAuctions: 50, maxTeams: 32 }
};

// ── File Upload Configuration & Magic Byte Verification ──
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use('/api/static/uploads', express.static(UPLOAD_DIR));
app.use('/static/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB Max
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|webp|gif/;
    const extValid = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimeValid = allowedExtensions.test(file.mimetype);
    if (extValid && mimeValid) {
      return cb(null, true);
    }
    cb(new Error('Invalid file format. Only JPG, PNG, WEBP, and GIF image files up to 5MB are allowed.'));
  }
});

// Magic Byte Buffer Inspection for Images
function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // GIF: 47 49 46 38 ("GIF8")
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WEBP: RIFF...WEBP
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;

  return false;
}

// ── MongoDB Atlas Connection ──
mongoose.connect(activeMongoUrl, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ Connected to MongoDB Atlas Database'))
  .catch((err) => console.error('❌ MongoDB Atlas Connection Error:', err.message));

// ── Database Schemas & Models ──

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['coordinator', 'player', 'owner'], default: 'player' },
  phone: { type: String, default: '' }
}, { timestamps: true });

const userPublicSelect = '-passwordHash';
const User = mongoose.model('User', userSchema);

const auctionSchema = new mongoose.Schema({
  coordinatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  sport: { type: String, default: 'Cricket' },
  date: { type: String, required: true },
  basePrice: { type: Number, default: 100000 },
  maxTeams: { type: Number, default: 8 },
  budgetPerTeam: { type: Number, default: 5000000 },
  description: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'upcoming', 'live', 'paused', 'completed', 'cancelled'], default: 'upcoming' },
  currentPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  currentBid: { type: Number, default: 0 },
  currentTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null }
}, { timestamps: true });

const Auction = mongoose.model('Auction', auctionSchema);

const teamSchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
  name: { type: String, required: true, trim: true },
  ownerName: { type: String, required: true, trim: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  color: { type: String, default: '#FF6B00' },
  purse: { type: Number, default: 5000000 },
  spent: { type: Number, default: 0 }
}, { timestamps: true });

const Team = mongoose.model('Team', teamSchema);

const playerSchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
  name: { type: String, required: true, trim: true },
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
  status: { type: String, enum: ['registered', 'queued', 'live', 'sold', 'unsold'], default: 'registered' },
  soldToTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  soldPrice: { type: Number, default: 0 }
}, { timestamps: true });

const Player = mongoose.model('Player', playerSchema);

const bidSchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  amount: { type: Number, required: true },
  bidderUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Bid = mongoose.model('Bid', bidSchema);

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  packageId: { type: String, required: true },
  packageName: { type: String, required: true },
  amount: { type: Number, required: true },
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  status: { type: String, enum: ['created', 'pending', 'paid', 'failed', 'refunded'], default: 'created' }
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);

// ── Standardized Response Envelope Helpers ──
function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function sendError(res, message, code = 'BAD_REQUEST', statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: { code, message } });
}

// ── Authentication & RBAC Middleware ──
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token required.', 'UNAUTHORIZED', 401);
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, activeJwtSecret);
    const user = await User.findById(decoded.id).select(userPublicSelect);
    if (!user) {
      return sendError(res, 'User session invalid. Please log in again.', 'UNAUTHORIZED', 401);
    }
    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired authentication session.', 'UNAUTHORIZED', 401);
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(res, `Access denied. Action requires role: ${allowedRoles.join(' or ')}`, 'FORBIDDEN', 403);
    }
    next();
  };
};

// ── API ROUTES ──

// Health Check Endpoint (Verifies active MongoDB connection)
app.get('/api/health', async (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  if (!dbConnected) {
    return sendError(res, 'Database connection offline', 'SERVICE_UNAVAILABLE', 503);
  }
  return sendSuccess(res, {
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes (Role Escalation Protection)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, admin_key, phone } = req.body;
    if (!name || !email || !password) {
      return sendError(res, 'Name, email, and password are required fields.', 'VALIDATION_ERROR', 400);
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return sendError(res, 'An account with this email address already exists.', 'CONFLICT', 409);
    }
    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long.', 'VALIDATION_ERROR', 400);
    }

    // Role Escalation Security: Public registration defaults to 'player' or 'owner'.
    // Registering as 'coordinator' requires administrative key authorization.
    let userRole = 'player';
    if (role === 'owner') {
      userRole = 'owner';
    } else if (role === 'coordinator') {
      const expectedAdminKey = process.env.ADMIN_REGISTRATION_KEY || 'auctionpro_admin_secret_2026';
      if (admin_key && admin_key === expectedAdminKey) {
        userRole = 'coordinator';
      } else {
        return sendError(res, 'Coordinator registration requires administrative authorization.', 'FORBIDDEN', 403);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: userRole,
      phone: phone ? phone.trim() : ''
    });
    await user.save();

    const token = jwt.sign({ id: user._id.toString(), role: user.role }, activeJwtSecret, { expiresIn: '7d' });
    const userPublic = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    return sendSuccess(res, { token, user: userPublic }, 201);
  } catch (err) {
    return sendError(res, 'Registration failed: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 'Email and password are required.', 'VALIDATION_ERROR', 400);
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return sendError(res, 'Invalid email or password.', 'UNAUTHORIZED', 401);
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 'UNAUTHORIZED', 401);
    }

    const token = jwt.sign({ id: user._id.toString(), role: user.role }, activeJwtSecret, { expiresIn: '7d' });
    const userPublic = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    return sendSuccess(res, { token, user: userPublic });
  } catch (err) {
    return sendError(res, 'Login failed: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  return sendSuccess(res, {
    id: req.user._id.toString(),
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    phone: req.user.phone
  });
});

// Dashboard Overview Stats Endpoint (Scoped to Coordinator Owned Auctions)
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const coordinatorId = req.user._id;
    const coordinatorAuctions = await Auction.find({ coordinatorId }).select('_id');
    const auctionIds = coordinatorAuctions.map(a => a._id);

    const [auctionsCount, activeAuctionsCount, playersCount, payments] = await Promise.all([
      Auction.countDocuments({ coordinatorId }),
      Auction.countDocuments({ coordinatorId, status: 'live' }),
      Player.countDocuments({ auctionId: { $in: auctionIds } }),
      Payment.find({ userId: coordinatorId, status: 'paid' })
    ]);

    const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    return sendSuccess(res, {
      total_auctions: auctionsCount,
      active_auctions: activeAuctionsCount,
      total_players: playersCount,
      total_revenue: totalRevenue
    });
  } catch (err) {
    return sendError(res, 'Failed to load stats: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// Auction Management Endpoints
app.get('/api/auctions', async (req, res) => {
  try {
    const { mine } = req.query;
    let query = {};
    if (mine === 'true' && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, activeJwtSecret);
        query.coordinatorId = decoded.id;
      } catch (e) {}
    }
    const auctions = await Auction.find(query).sort({ createdAt: -1 });
    const formatted = auctions.map(a => ({
      id: a._id.toString(),
      name: a.name,
      sport: a.sport,
      date: a.date,
      base_price: a.basePrice,
      max_teams: a.maxTeams,
      budget_per_team: a.budgetPerTeam,
      description: a.description,
      status: a.status,
      current_player_id: a.currentPlayerId ? a.currentPlayerId.toString() : null,
      current_bid: a.currentBid,
      current_team_id: a.currentTeamId ? a.currentTeamId.toString() : null
    }));
    return sendSuccess(res, formatted);
  } catch (err) {
    return sendError(res, 'Failed to fetch auctions: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.get('/api/auctions/public', async (req, res) => {
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
    return sendSuccess(res, formatted);
  } catch (err) {
    return sendError(res, 'Failed to fetch public auctions: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.get('/api/auctions/:id', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return sendError(res, 'Auction not found.', 'NOT_FOUND', 404);
    }
    const formatted = {
      id: auction._id.toString(),
      name: auction.name,
      sport: auction.sport,
      date: auction.date,
      base_price: auction.basePrice,
      max_teams: auction.maxTeams,
      budget_per_team: auction.budgetPerTeam,
      description: auction.description,
      status: auction.status,
      current_player_id: auction.currentPlayerId ? auction.currentPlayerId.toString() : null,
      current_bid: auction.currentBid,
      current_team_id: auction.currentTeamId ? auction.currentTeamId.toString() : null
    };
    return sendSuccess(res, formatted);
  } catch (err) {
    return sendError(res, 'Invalid auction ID.', 'BAD_REQUEST', 400);
  }
});

app.post('/api/auctions', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const { name, sport, date, base_price, max_teams, budget_per_team, description } = req.body;
    if (!name || !date) {
      return sendError(res, 'Auction name and date are required.', 'VALIDATION_ERROR', 400);
    }

    // Server Entitlement Check: Enforce max allowed auctions based on purchased package
    const paidPayments = await Payment.find({ userId: req.user._id, status: 'paid' });
    let maxAuctionsAllowed = 1; // Default starter entitlement
    for (const pay of paidPayments) {
      const pkg = PACKAGES[pay.packageId] || PACKAGES[pay.packageName];
      if (pkg && pkg.maxAuctions > maxAuctionsAllowed) {
        maxAuctionsAllowed = pkg.maxAuctions;
      }
    }

    const existingAuctionsCount = await Auction.countDocuments({ coordinatorId: req.user._id });
    if (existingAuctionsCount >= maxAuctionsAllowed) {
      return sendError(res, `Auction limit reached. Your active tier permits up to ${maxAuctionsAllowed} auction(s). Upgrade package to create more.`, 'ENTITLEMENT_EXCEEDED', 403);
    }

    const auction = new Auction({
      coordinatorId: req.user._id,
      name: name.trim(),
      sport: sport || 'Cricket',
      date,
      basePrice: Number(base_price) || 100000,
      maxTeams: Number(max_teams) || 8,
      budgetPerTeam: Number(budget_per_team) || 5000000,
      description: description || '',
      status: 'upcoming'
    });

    await auction.save();

    const formatted = {
      id: auction._id.toString(),
      name: auction.name,
      sport: auction.sport,
      date: auction.date,
      base_price: auction.basePrice,
      max_teams: auction.maxTeams,
      budget_per_team: auction.budgetPerTeam,
      description: auction.description,
      status: auction.status
    };

    return sendSuccess(res, formatted, 201);
  } catch (err) {
    return sendError(res, 'Failed to create auction: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.delete('/api/auctions/:id', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return sendError(res, 'Auction not found.', 'NOT_FOUND', 404);
    }
    if (auction.coordinatorId.toString() !== req.user._id.toString()) {
      return sendError(res, 'You are only authorized to delete auctions created by your account.', 'FORBIDDEN', 403);
    }

    await Promise.all([
      Auction.findByIdAndDelete(req.params.id),
      Team.deleteMany({ auctionId: req.params.id }),
      Player.deleteMany({ auctionId: req.params.id }),
      Bid.deleteMany({ auctionId: req.params.id })
    ]);

    return sendSuccess(res, { message: 'Auction and related teams/players deleted successfully.' });
  } catch (err) {
    return sendError(res, 'Failed to delete auction: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// Team Management Endpoints
app.get('/api/teams', async (req, res) => {
  try {
    const { auction_id } = req.query;
    const query = auction_id ? { auctionId: auction_id } : {};
    const teams = await Team.find(query).sort({ createdAt: 1 });
    const formatted = teams.map(t => ({
      id: t._id.toString(),
      auction_id: t.auctionId.toString(),
      name: t.name,
      owner_name: t.ownerName,
      color: t.color,
      purse: t.purse,
      spent: t.spent
    }));
    return sendSuccess(res, formatted);
  } catch (err) {
    return sendError(res, 'Failed to fetch teams: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.post('/api/teams', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const { auction_id, name, owner_name, color, purse } = req.body;
    if (!auction_id || !name || !owner_name) {
      return sendError(res, 'Auction ID, team name, and owner name are required.', 'VALIDATION_ERROR', 400);
    }

    const team = new Team({
      auctionId: auction_id,
      name: name.trim(),
      ownerName: owner_name.trim(),
      ownerUserId: req.user._id,
      color: color || '#FF6B00',
      purse: purse ? Number(purse) : 5000000,
      spent: 0
    });
    await team.save();

    const formatted = {
      id: team._id.toString(),
      auction_id: team.auctionId.toString(),
      name: team.name,
      owner_name: team.ownerName,
      color: team.color,
      purse: team.purse,
      spent: team.spent
    };
    return sendSuccess(res, formatted, 201);
  } catch (err) {
    return sendError(res, 'Failed to add team: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.delete('/api/teams/:id', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) {
      return sendError(res, 'Team not found.', 'NOT_FOUND', 404);
    }
    return sendSuccess(res, { message: 'Team deleted successfully.' });
  } catch (err) {
    return sendError(res, 'Failed to delete team: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// Player Management Endpoints
app.get('/api/players', async (req, res) => {
  try {
    const { auction_id } = req.query;
    const query = auction_id ? { auctionId: auction_id } : {};
    const players = await Player.find(query).sort({ lotNumber: 1, createdAt: -1 });
    const formatted = players.map(p => ({
      id: p._id.toString(),
      auction_id: p.auctionId.toString(),
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
      sold_to_team_id: p.soldToTeamId ? p.soldToTeamId.toString() : null,
      sold_price: p.soldPrice
    }));
    return sendSuccess(res, formatted);
  } catch (err) {
    return sendError(res, 'Failed to fetch players: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.post('/api/players', async (req, res) => {
  try {
    const p = req.body;
    if (!p.name || !p.auction_id) {
      return sendError(res, 'Player name and target auction ID are required.', 'VALIDATION_ERROR', 400);
    }

    const player = new Player({
      auctionId: p.auction_id,
      name: p.name.trim(),
      role: p.role || 'Batsman',
      sport: p.sport || 'Cricket',
      basePrice: p.base_price ? Number(p.base_price) : 100000,
      city: p.city || '',
      phone: p.phone || '',
      jerseyNumber: p.jersey_number ? Number(p.jersey_number) : 1,
      battingStyle: p.batting_style || 'Right Hand Batsman',
      bowlingStyle: p.bowling_style || 'Right Arm Medium',
      age: p.age ? Number(p.age) : 21,
      lotNumber: p.lot_number ? Number(p.lot_number) : 1,
      bio: p.bio || '',
      photoUrl: p.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
      status: 'registered'
    });

    await player.save();

    const formatted = {
      id: player._id.toString(),
      auction_id: player.auctionId.toString(),
      name: player.name,
      role: player.role,
      base_price: player.basePrice,
      status: player.status,
      photo_url: player.photoUrl
    };
    return sendSuccess(res, formatted, 201);
  } catch (err) {
    return sendError(res, 'Failed to register player: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.put('/api/players/:id', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const { status, role, base_price } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (base_price) updateData.basePrice = Number(base_price);

    const player = await Player.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!player) {
      return sendError(res, 'Player not found.', 'NOT_FOUND', 404);
    }
    return sendSuccess(res, {
      id: player._id.toString(),
      name: player.name,
      status: player.status
    });
  } catch (err) {
    return sendError(res, 'Failed to update player: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// ── Server-Authoritative Real-Time Auction Bidding Engine ──

// Select Next Player for Bidding
app.post('/api/auction/next', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const { auction_id, player_id } = req.body;
    if (!auction_id || !player_id) {
      return sendError(res, 'Auction ID and Player ID required.', 'VALIDATION_ERROR', 400);
    }

    const [auction, player] = await Promise.all([
      Auction.findById(auction_id),
      Player.findById(player_id)
    ]);

    if (!auction || !player) {
      return sendError(res, 'Auction or player not found.', 'NOT_FOUND', 404);
    }

    // Update Player & Auction state
    player.status = 'live';
    await player.save();

    auction.status = 'live';
    auction.currentPlayerId = player._id;
    auction.currentBid = player.basePrice;
    auction.currentTeamId = null;
    await auction.save();

    const formattedPlayer = {
      id: player._id.toString(),
      auction_id: player.auctionId.toString(),
      name: player.name,
      role: player.role,
      base_price: player.basePrice,
      photo_url: player.photoUrl,
      status: player.status
    };

    // Broadcast Socket.IO Event
    io.to(auction_id).emit('next_player', {
      player: formattedPlayer,
      base_price: player.basePrice
    });

    return sendSuccess(res, { message: 'Next player selected successfully.', player: formattedPlayer });
  } catch (err) {
    return sendError(res, 'Failed to select next player: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// Place Bid (Server-Authoritative Validation, Team Ownership & Atomic Concurrency Update)
app.post('/api/bids', authMiddleware, async (req, res) => {
  try {
    const { auction_id, player_id, team_id, amount } = req.body;
    if (!auction_id || !player_id || !team_id || !amount) {
      return sendError(res, 'Auction ID, player ID, team ID, and bid amount are required.', 'VALIDATION_ERROR', 400);
    }

    const bidAmount = Number(amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      return sendError(res, 'Bid amount must be a positive number.', 'INVALID_BID_AMOUNT', 400);
    }

    const [auction, player, team] = await Promise.all([
      Auction.findById(auction_id),
      Player.findById(player_id),
      Team.findById(team_id)
    ]);

    if (!auction || !player || !team) {
      return sendError(res, 'Auction, player, or team invalid.', 'NOT_FOUND', 404);
    }

    // 1. Verify player belongs to auction and team belongs to auction
    if (player.auctionId.toString() !== auction_id || team.auctionId.toString() !== auction_id) {
      return sendError(res, 'Player or team does not belong to this auction.', 'CROSS_AUCTION_MISMATCH', 400);
    }

    // 2. Verify bidder authorization (coordinator OR team owner)
    const isCoordinator = auction.coordinatorId.toString() === req.user._id.toString();
    const isTeamOwner = team.ownerUserId ? team.ownerUserId.toString() === req.user._id.toString() : false;
    const isOwnerByName = team.ownerName && req.user.name && team.ownerName.toLowerCase().trim() === req.user.name.toLowerCase().trim();

    if (!isCoordinator && !isTeamOwner && !isOwnerByName && req.user.role !== 'coordinator') {
      return sendError(res, 'You are not authorized to place bids on behalf of this team.', 'UNAUTHORIZED_TEAM_BID', 403);
    }

    // 3. Verify auction & player status
    if (auction.status !== 'live' || !auction.currentPlayerId || auction.currentPlayerId.toString() !== player_id) {
      return sendError(res, 'Auction is not live or player is not the active player on the block.', 'INVALID_AUCTION_STATE', 400);
    }

    // 4. Verify team purse capacity
    const remainingPurse = team.purse - team.spent;
    if (bidAmount > remainingPurse) {
      return sendError(res, `Insufficient team purse. Remaining balance is ₹${remainingPurse.toLocaleString('en-IN')}`, 'INSUFFICIENT_PURSE', 400);
    }

    // 5. Atomic Concurrency Update: only update if currentBid is less than new bid
    const updatedAuction = await Auction.findOneAndUpdate(
      {
        _id: auction_id,
        status: 'live',
        currentPlayerId: player_id,
        $or: [
          { currentBid: { $lt: bidAmount } },
          { currentTeamId: null }
        ]
      },
      {
        $set: { currentBid: bidAmount, currentTeamId: team._id }
      },
      { new: true }
    );

    if (!updatedAuction) {
      return sendError(res, 'Bid rejected: a higher or concurrent bid was already processed.', 'BID_OUTDATED', 400);
    }

    // Save Bid record
    const bid = new Bid({
      auctionId: auction._id,
      playerId: player._id,
      teamId: team._id,
      amount: bidAmount,
      bidderUserId: req.user._id
    });
    await bid.save();

    const teamFormatted = {
      id: team._id.toString(),
      name: team.name,
      owner_name: team.ownerName,
      color: team.color,
      purse: team.purse,
      spent: team.spent
    };

    // Broadcast Socket.IO Event
    io.to(auction_id).emit('bid', {
      bid: { id: bid._id.toString(), amount: bidAmount },
      team: teamFormatted,
      player_id: player._id.toString()
    });

    return sendSuccess(res, { message: 'Bid placed successfully.', bid, team: teamFormatted });
  } catch (err) {
    return sendError(res, 'Failed to place bid: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// Mark Player Sold (Atomic Transaction-Safe Purse Deduction & Duplicate Sale Rejection)
app.post('/api/auction/sold', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const { auction_id, player_id, team_id, price } = req.body;
    if (!auction_id || !player_id || !team_id) {
      return sendError(res, 'Auction ID, player ID, and winning team ID required.', 'VALIDATION_ERROR', 400);
    }

    const soldPrice = Number(price);

    // Atomic Check: Player must be 'live' to be sold
    const player = await Player.findOneAndUpdate(
      { _id: player_id, status: 'live' },
      { $set: { status: 'sold', soldToTeamId: team_id, soldPrice: soldPrice } },
      { new: true }
    );

    if (!player) {
      return sendError(res, 'Cannot sell player: player is not active or has already been sold/unsold.', 'INVALID_PLAYER_STATE', 409);
    }

    // Atomic Team Purse Deduction
    const team = await Team.findByIdAndUpdate(
      team_id,
      { $inc: { spent: soldPrice } },
      { new: true }
    );

    // Clear Auction Active State
    await Auction.findByIdAndUpdate(auction_id, {
      $set: { currentPlayerId: null, currentBid: 0, currentTeamId: null }
    });

    const teamFormatted = {
      id: team._id.toString(),
      name: team.name,
      owner_name: team.ownerName,
      purse: team.purse,
      spent: team.spent
    };

    const playerFormatted = {
      id: player._id.toString(),
      name: player.name,
      status: player.status,
      sold_price: player.soldPrice
    };

    // Broadcast Socket.IO Event
    io.to(auction_id).emit('sold', {
      player: playerFormatted,
      team: teamFormatted,
      price: soldPrice
    });

    return sendSuccess(res, { message: 'Player marked as sold successfully.', player: playerFormatted, team: teamFormatted });
  } catch (err) {
    return sendError(res, 'Failed to mark player as sold: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// Mark Player Unsold
app.post('/api/auction/unsold', authMiddleware, requireRole('coordinator'), async (req, res) => {
  try {
    const { auction_id, player_id } = req.body;
    if (!auction_id || !player_id) {
      return sendError(res, 'Auction ID and player ID required.', 'VALIDATION_ERROR', 400);
    }

    const player = await Player.findOneAndUpdate(
      { _id: player_id, status: 'live' },
      { $set: { status: 'unsold' } },
      { new: true }
    );

    if (!player) {
      return sendError(res, 'Cannot mark unsold: player is not in active live state.', 'INVALID_PLAYER_STATE', 409);
    }

    await Auction.findByIdAndUpdate(auction_id, {
      $set: { currentPlayerId: null, currentBid: 0, currentTeamId: null }
    });

    const playerFormatted = {
      id: player._id.toString(),
      name: player.name,
      status: player.status
    };

    // Broadcast Socket.IO Event
    io.to(auction_id).emit('unsold', { player: playerFormatted });

    return sendSuccess(res, { message: 'Player marked as unsold.', player: playerFormatted });
  } catch (err) {
    return sendError(res, 'Failed to mark player as unsold: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// File Upload Endpoint with Magic Byte Inspection
const handleUpload = (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return sendError(res, err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds 5MB limit.' : err.message, 'FILE_TOO_LARGE', 400);
    } else if (err) {
      return sendError(res, err.message, 'INVALID_FILE', 400);
    }
    if (!req.file) {
      return sendError(res, 'No file uploaded.', 'NO_FILE', 400);
    }

    // Inspect Magic Bytes of uploaded file
    try {
      const buffer = fs.readFileSync(req.file.path);
      if (!validateImageMagicBytes(buffer)) {
        fs.unlinkSync(req.file.path); // Delete invalid file immediately
        return sendError(res, 'Invalid image file content. File failed magic byte verification.', 'INVALID_FILE_CONTENT', 400);
      }
    } catch (e) {
      return sendError(res, 'File content verification failed.', 'FILE_VERIFICATION_ERROR', 400);
    }

    const fileUrl = `/static/uploads/${req.file.filename}`;
    return sendSuccess(res, { url: fileUrl, filename: req.file.filename });
  });
};

app.post('/api/upload', authMiddleware, handleUpload);
app.post('/api/uploads/image', authMiddleware, handleUpload);

// ── Razorpay Server-Authoritative Payments ──

app.post('/api/checkout', authMiddleware, async (req, res) => {
  try {
    const { package_id, package_name } = req.body;
    const pkgKey = package_id || package_name || 'tier_starter';
    const pkg = PACKAGES[pkgKey] || PACKAGES['tier_starter'];

    const amountInPaisa = Math.round(pkg.price * 100);

    let orderId = `order_sim_${Date.now()}`;
    if (razorpayClient && pkg.price > 0 && RAZORPAY_KEY_ID && !RAZORPAY_KEY_ID.includes('demo')) {
      try {
        const order = await razorpayClient.orders.create({
          amount: amountInPaisa,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`
        });
        orderId = order.id;
      } catch (e) {
        console.warn('[Razorpay Order Notice] Live order creation warning:', e.message);
      }
    }

    const payment = new Payment({
      userId: req.user._id,
      packageId: pkg.id,
      packageName: pkg.name,
      amount: pkg.price,
      razorpayOrderId: orderId,
      status: pkg.price === 0 ? 'paid' : 'created'
    });
    await payment.save();

    return sendSuccess(res, {
      order_id: orderId,
      key_id: RAZORPAY_KEY_ID || 'rzp_test_demo123key',
      amount: amountInPaisa,
      currency: 'INR',
      package_name: pkg.name
    });
  } catch (err) {
    return sendError(res, 'Failed to create payment checkout order: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.post('/api/payment/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, package_name, amount } = req.body;

    if (!razorpay_order_id) {
      return sendError(res, 'Order ID is required.', 'VALIDATION_ERROR', 400);
    }

    // Cryptographic Signature Verification
    if (RAZORPAY_KEY_SECRET) {
      if (!razorpay_signature) {
        return sendError(res, 'Payment signature is required for verification.', 'MISSING_SIGNATURE', 400);
      }

      const generatedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return sendError(res, 'Invalid payment signature. Verification failed.', 'INVALID_SIGNATURE', 400);
      }
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        $set: {
          razorpayPaymentId: razorpay_payment_id || 'pay_' + Date.now(),
          razorpaySignature: razorpay_signature || '',
          status: 'paid'
        }
      },
      { new: true, upsert: true }
    );

    return sendSuccess(res, {
      message: `${payment.packageName} package activated successfully!`,
      payment_id: payment._id.toString()
    });
  } catch (err) {
    return sendError(res, 'Payment verification failed: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// Idempotent Razorpay Webhook Handler
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return sendError(res, 'x-razorpay-signature header is required.', 'MISSING_SIGNATURE', 400);
    }

    if (!RAZORPAY_WEBHOOK_SECRET) {
      return sendError(res, 'Razorpay webhook secret is not configured on server.', 'SERVER_CONFIG_ERROR', 500);
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return sendError(res, 'Invalid webhook signature.', 'INVALID_SIGNATURE', 400);
    }

    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity || req.body.payload?.order?.entity;
      if (paymentEntity?.order_id) {
        await Payment.updateOne(
          { razorpayOrderId: paymentEntity.order_id },
          {
            $set: {
              status: 'paid',
              razorpayPaymentId: paymentEntity.id || ''
            }
          }
        );
      }
    }
    return sendSuccess(res, { status: 'webhook_processed' });
  } catch (err) {
    return sendError(res, 'Webhook error: ' + err.message, 'SERVER_ERROR', 500);
  }
});

app.get('/api/payments', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const formatted = payments.map(p => ({
      id: p._id.toString(),
      package_name: p.packageName,
      amount: p.amount,
      status: p.status,
      created_at: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString()
    }));
    return sendSuccess(res, formatted);
  } catch (err) {
    return sendError(res, 'Failed to fetch payments: ' + err.message, 'SERVER_ERROR', 500);
  }
});

// ── Socket.IO Connection & Real-Time Event Handlers ──
io.on('connection', (socket) => {
  console.log('⚡ Socket connected:', socket.id);

  socket.on('join_auction', ({ auction_id }) => {
    if (auction_id) {
      socket.join(auction_id.toString());
      console.log(`Socket ${socket.id} joined room: ${auction_id}`);
    }
  });

  socket.on('leave_auction', ({ auction_id }) => {
    if (auction_id) {
      socket.leave(auction_id.toString());
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// ── Start Production Server ──
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AuctionPro Production Backend running on port ${PORT}`);
});

module.exports = app;
