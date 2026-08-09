# AuctionPro — Production API Contract

## Overview
All endpoints run on the Node.js Express backend server (`backend/index.js`) and return standard JSON response envelopes:
- **Success Envelope**: `{ "success": true, "data": ... }`
- **Error Envelope**: `{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }`

---

## Endpoints Specification

### 1. Health & Readiness
- `GET /api/health`
  - **Auth**: None
  - **Success (200)**: `{ "success": true, "data": { "status": "healthy", "database": "connected", "timestamp": "..." } }`
  - **Failure (503)**: Service unavailable if MongoDB connection is offline.

---

### 2. Authentication (`/api/auth/*`)
- `POST /api/auth/register`
  - **Auth**: Public
  - **Body**: `{ "name": "...", "email": "...", "password": "...", "role": "coordinator" | "player" | "owner", "phone": "..." }`
  - **Success (201)**: `{ "success": true, "data": { "token": "JWT_TOKEN", "user": { "id": "...", "name": "...", "email": "...", "role": "..." } } }`
  - **Failure (400, 409)**: Validation errors or duplicate email registration.

- `POST /api/auth/login`
  - **Auth**: Public
  - **Body**: `{ "email": "...", "password": "..." }`
  - **Success (200)**: `{ "success": true, "data": { "token": "JWT_TOKEN", "user": { "id": "...", "name": "...", "email": "...", "role": "..." } } }`
  - **Failure (401)**: Invalid credentials.

- `GET /api/auth/me`
  - **Auth**: Bearer JWT (`authMiddleware`)
  - **Success (200)**: `{ "success": true, "data": { "id": "...", "name": "...", "email": "...", "role": "...", "phone": "..." } }`
  - **Failure (401)**: Unauthenticated or expired token.

---

### 3. Dashboard Statistics
- `GET /api/stats`
  - **Auth**: Bearer JWT (`coordinator`)
  - **Success (200)**: `{ "success": true, "data": { "total_auctions": 5, "active_auctions": 1, "total_players": 42, "total_revenue": 15000 } }`

---

### 4. Auction Management (`/api/auctions/*`)
- `GET /api/auctions`
  - **Auth**: Public / Optional (`?mine=true`)
  - **Success (200)**: Array of auction objects.

- `GET /api/auctions/public`
  - **Auth**: Public
  - **Success (200)**: Array of public upcoming/live auctions.

- `GET /api/auctions/:id`
  - **Auth**: Public
  - **Success (200)**: Single auction object populated with active player/team status.

- `POST /api/auctions`
  - **Auth**: Bearer JWT (`coordinator`)
  - **Body**: `{ "name": "...", "sport": "Cricket", "date": "2026-09-01", "base_price": 100000, "max_teams": 8, "budget_per_team": 5000000, "description": "..." }`
  - **Success (201)**: Created auction object.

- `DELETE /api/auctions/:id`
  - **Auth**: Bearer JWT (`coordinator` - Creator ownership check)
  - **Success (200)**: `{ "success": true, "data": { "message": "Auction deleted" } }`

---

### 5. Team Management (`/api/teams/*`)
- `GET /api/teams?auction_id=:id`
  - **Auth**: Public
  - **Success (200)**: List of teams participating in the specified auction.

- `POST /api/teams`
  - **Auth**: Bearer JWT (`coordinator`)
  - **Body**: `{ "auction_id": "...", "name": "...", "owner_name": "...", "color": "#FF6B00", "purse": 5000000 }`
  - **Success (201)**: Created team object.

- `DELETE /api/teams/:id`
  - **Auth**: Bearer JWT (`coordinator`)
  - **Success (200)**: `{ "success": true, "data": { "message": "Team deleted" } }`

---

### 6. Player Pool Management (`/api/players/*`)
- `GET /api/players?auction_id=:id`
  - **Auth**: Public
  - **Success (200)**: List of registered players.

- `POST /api/players`
  - **Auth**: Public / Authenticated
  - **Body**: `{ "auction_id": "...", "name": "...", "role": "Batsman", "sport": "Cricket", "base_price": 100000, "photo_url": "..." }`
  - **Success (201)**: Created player object.

- `PUT /api/players/:id`
  - **Auth**: Bearer JWT (`coordinator`)
  - **Body**: `{ "status": "registered" | "queued" | "live" | "sold" | "unsold", "role": "...", "base_price": 100000 }`
  - **Success (200)**: Updated player object.

---

### 7. Real-Time Server-Authoritative Auction Bidding Engine (`/api/auction/*` & `/api/bids`)
- `POST /api/auction/next`
  - **Auth**: Bearer JWT (`coordinator`)
  - **Body**: `{ "auction_id": "...", "player_id": "..." }`
  - **Behavior**: Sets player to `live`, sets auction current player & base price, broadcasts Socket event `next_player`.

- `POST /api/bids`
  - **Auth**: Bearer JWT (`coordinator` | `owner`)
  - **Body**: `{ "auction_id": "...", "player_id": "...", "team_id": "...", "amount": 2500000 }`
  - **Validation**: Server verifies active auction, player is current player, team purse >= bid, amount > current bid.
  - **Behavior**: Atomically records bid, updates auction `currentBid` & `currentTeamId`, broadcasts Socket event `bid`.

- `POST /api/auction/sold`
  - **Auth**: Bearer JWT (`coordinator`)
  - **Body**: `{ "auction_id": "...", "player_id": "...", "team_id": "...", "price": 2500000 }`
  - **Behavior**: Atomically increments `Team.spent`, sets `Player.status = 'sold'`, clears active auction player, broadcasts Socket event `sold`.

- `POST /api/auction/unsold`
  - **Auth**: Bearer JWT (`coordinator`)
  - **Body**: `{ "auction_id": "...", "player_id": "..." }`
  - **Behavior**: Sets `Player.status = 'unsold'`, clears active auction player, broadcasts Socket event `unsold`.

---

### 8. File Uploads (`/api/upload` & `/api/uploads/image`)
- `POST /api/upload`
  - **Auth**: Bearer JWT
  - **Body**: `multipart/form-data` with `file`
  - **Validation**: 5MB size limit, JPEG/PNG/WEBP/GIF extension & MIME check.
  - **Success (200)**: `{ "success": true, "data": { "url": "/static/uploads/img_....png", "filename": "img_....png" } }`

---

### 9. Razorpay Server-Authoritative Payments (`/api/checkout`, `/api/payment/*`)
- `POST /api/checkout`
  - **Auth**: Bearer JWT
  - **Body**: `{ "package_id": "1 Auction" | "4 Teams" | "8 Teams" | "Unlimited" }`
  - **Behavior**: Server retrieves exact price from trusted server package catalog (`PACKAGES`), creates Razorpay Order server-side, returns `order_id` & `amount`.

- `POST /api/payment/verify`
  - **Auth**: Bearer JWT
  - **Body**: `{ "razorpay_order_id": "...", "razorpay_payment_id": "...", "razorpay_signature": "...", "package_name": "..." }`
  - **Behavior**: Cryptographically verifies `razorpay_signature` using HMAC-SHA256 and `RAZORPAY_KEY_SECRET`, marks Payment as `paid`.

- `POST /api/payment/webhook`
  - **Auth**: Webhook Signature (`x-razorpay-signature`)
  - **Behavior**: Verifies HMAC-SHA256 signature using `RAZORPAY_WEBHOOK_SECRET`, processes `payment.captured` idempotently.

- `GET /api/payments`
  - **Auth**: Bearer JWT
  - **Success (200)**: Array of user payment records.
