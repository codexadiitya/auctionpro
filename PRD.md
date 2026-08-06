# AuctionPro PRD

## Problem Statement
Build full-stack features for AuctionPro (existing landing page): JWT auth, coordinator dashboard, player registration, live auction room (WebSocket), team owner mobile view, Stripe payments, image uploads. Remove Emergent branding/integrations.

## User Personas
- **Coordinator**: Tournament organizer who creates auctions, teams, runs the live auction room.
- **Player**: Athlete registering for an auction pool; views own sold/unsold status.
- **Team Owner (mobile)**: Watches live auction and pushes remote bids from phone.
- **Spectator**: Public read-only viewer of auction progress.

## Core Requirements (static)
- JWT auth (bcrypt + PyJWT), two roles (coordinator, player), protected routes
- CRUD for auctions/teams/players/bids
- Live auction room with Socket.IO realtime bidding, sold effects (canvas-confetti), fortune wheel, 15s timer
- Stripe checkout (Flow B raw SDK, replaces emergentintegrations)
- Image uploads (disk-based, `/api/uploads/image` + static serving)
- Coordinator dashboard: Overview/Auctions/Teams/Players/Payments/Settings

## Implemented (2026-02)
- Backend: server.py rewritten with FastAPI + Socket.IO ASGI wrapper, JWT, CRUD, uploads, Stripe (raw stripe SDK), mock WhatsApp log on sold
- Frontend: AuthContext, ProtectedRoute, Login, Register, PlayerRegister, PlayerProfile, CoordinatorDashboard (with sub-routes), AuctionRoom, LiveSpectator, OwnerMobile
- Header updated with Login/Register/Dashboard buttons (Emergent branding removed)
- All 4 payment packages retained; test key `sk_test_emergent` in .env (overrideable)

## Backlog / Next Actions
- Real WhatsApp/SMS integration (currently mocked to log + toast)
- S3-style object storage (currently local disk)
- Advanced auction filters, unsold re-auction phase
- Multi-currency support, Stripe webhook signature verification
- Team owner squad list live update
