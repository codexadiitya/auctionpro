# AuctionPro 🏏

> Live sports player auction platform with real-time bidding, JWT auth, and Stripe payments.

## Features
- 🔐 JWT Authentication (Coordinator & Player roles)
- 🏟️ Live Auction Room with Socket.IO real-time bidding
- 🎯 Fortune Wheel player picker
- 💳 Stripe payment integration
- 📸 Player photo uploads
- 📊 Coordinator Dashboard with stats
- 📱 Mobile-friendly Team Owner view

## Tech Stack
| Layer | Tech |
|-------|------|
| Backend | FastAPI + Socket.IO + MongoDB |
| Frontend | React + TailwindCSS + shadcn/ui |
| Auth | JWT (PyJWT + bcrypt) |
| Payments | Stripe |
| Realtime | Socket.IO |

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate  # Windows Git Bash
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

## Environment Variables

Copy `backend/.env` and fill in:
```env
MONGO_URL=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/
DB_NAME=auctionpro
JWT_SECRET=your-strong-random-secret-min-32-chars
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your_razorpay_secret
CORS_ORIGINS=https://yourdomain.com
```

## Deploy
- **Backend** → [Render.com](https://render.com)
- **Frontend** → [Vercel](https://vercel.com)
- **Database** → [MongoDB Atlas](https://cloud.mongodb.com) (free)
