#!/bin/bash
# AuctionPro - Start both servers
# Run from auctionpro/ folder AFTER running setup.sh

echo "Starting AuctionPro..."

# Start backend in background
cd backend
source .venv/Scripts/activate
echo "[Backend] Starting on http://localhost:8000 ..."
uvicorn server:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
cd frontend
echo "[Frontend] Starting on http://localhost:3000 ..."
echo ""
echo "================================================"
echo "  Backend:  http://localhost:8000/api/packages"
echo "  Frontend: http://localhost:3000"
echo "  Press Ctrl+C to stop everything"
echo "================================================"
npm start

# Cleanup backend when frontend exits
kill $BACKEND_PID 2>/dev/null
