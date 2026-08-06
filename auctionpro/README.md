# AuctionPro Player-Auction Suite

Rebranded and modernized sports player-auction platform clone of **Super Player Auction**. Built with a sports-oriented dark mode theme using high-energy orange/amber accents, customized display typography, interactive mockups, and Stripe checkout payments.

---

## File Architecture

```
auctionpro/
├── backend/
│   ├── .env                       # Backend Environment Configuration
│   ├── server.py                  # FastAPI Application Entrypoint & API Endpoints
│   └── requirements.txt           # Python Package Dependencies
│
├── frontend/
│   ├── package.json               # Node Package Dependencies & Scripts
│   └── src/
│       ├── App.js                 # React Application Routing Setup
│       ├── App.css                # Global App Styling
│       ├── index.css              # Custom Tailwind Styles & Theme Config
│       ├── mock.js                # Core Mock Datasets
│       │
│       ├── components/
│       │   ├── Header.jsx         # Responsive Navigation Bar
│       │   ├── Footer.jsx         # Contact & Quick Links Footer
│       │   ├── Hero.jsx           # Dark Hero Showcase with Live Stats
│       │   ├── AuctionsSection.jsx# Live and Upcoming Auctions Section
│       │   ├── About.jsx          # Experience & Adaptability Showcase
│       │   ├── MobileApp.jsx      # Mobile App Promotion & Mock Device
│       │   ├── Pricing.jsx        # Stripe Integrated Payment Grid
│       │   ├── Clients.jsx        # Testimonial Quotes & Logos Marquee
│       │   ├── Contact.jsx        # Contact & Walkthrough Booking Forms
│       │   │
│       │   └── ui/                # Custom styled Reusable UI Components
│       │       ├── badge.jsx
│       │       ├── button.jsx
│       │       ├── card.jsx
│       │       ├── input.jsx
│       │       ├── label.jsx
│       │       ├── textarea.jsx
│       │       └── toaster.jsx
│       │
│       ├── hooks/
│       │   └── use-toast.js       # Toast Event Trigger Hook
│       │
│       └── pages/
│           ├── Landing.jsx        # Main Composite Landing Page
│           ├── PaymentCancel.jsx  # Cancel Checkout Redirect Page
│           └── PaymentSuccess.jsx # Success Payment Status Polling Page
│
└── test_result.md                 # System Agent Testing Documentation
```

---

## Getting Started

### 1. Prerequisites
- **Python 3.8+**
- **NodeJS 16+** & **npm** / **yarn**
- **MongoDB** running locally on port `27017`

### 2. Backend Setup
1. Move to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

### 3. Frontend Setup
1. Move to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Set your backend URL environment variable:
   Create a `.env` file in the `frontend/` directory with:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```
4. Start the React development server:
   ```bash
   npm start
   ```
   *The frontend will run on `http://localhost:3000`.*
