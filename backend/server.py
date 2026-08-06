"""
AuctionPro - Backend API Server
================================
A real-time sports player auction platform.

Tech Stack:
    - FastAPI     : REST API framework
    - Socket.IO   : Real-time bidding events
    - MongoDB     : Database (via Motor async driver)
    - JWT         : Authentication tokens
    - Stripe      : Payment processing
    - bcrypt      : Password hashing

Author  : AuctionPro Team
Version : 2.0.0
"""

# ─────────────────────────────────────────────────────────────────────────────
# Standard Library Imports
# ─────────────────────────────────────────────────────────────────────────────
import json
import logging
import os
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# ─────────────────────────────────────────────────────────────────────────────
# Third-Party Imports
# ─────────────────────────────────────────────────────────────────────────────
import bcrypt
import jwt as pyjwt
import socketio
import stripe
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware

# ─────────────────────────────────────────────────────────────────────────────
# Configuration & Environment
# ─────────────────────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Database
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME   = os.environ["DB_NAME"]

# Security — crash loudly if JWT_SECRET is not set
JWT_SECRET    = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_DAYS = 7

if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is required. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

# File uploads
UPLOAD_DIR      = Path(os.environ.get("UPLOAD_DIR", "uploads"))
MAX_UPLOAD_SIZE = 5 * 1024 * 1024   # 5 MB limit
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

# Stripe — optional, leave blank to disable payments
stripe.api_key          = os.environ.get("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET   = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# CORS — restrict to your frontend domain in production
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

# Create upload directory if it doesn't exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# Database Connection
# ─────────────────────────────────────────────────────────────────────────────
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("auctionpro")

# ─────────────────────────────────────────────────────────────────────────────
# Socket.IO Server (real-time bidding)
# ─────────────────────────────────────────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App & Middleware
# ─────────────────────────────────────────────────────────────────────────────
app        = FastAPI(title="AuctionPro API", version="2.0.0")
api_router = APIRouter(prefix="/api")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security HTTP headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"]        = "DENY"
        response.headers["X-XSS-Protection"]       = "1; mode=block"
        response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Serve uploaded images at /api/static/uploads/<filename>
app.mount(
    "/api/static/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads",
)


# ═════════════════════════════════════════════════════════════════════════════
# HELPER UTILITIES
# ═════════════════════════════════════════════════════════════════════════════

def utc_now() -> datetime:
    """Return current UTC time as timezone-aware datetime."""
    return datetime.now(timezone.utc)


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(plain_password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if a plain-text password matches a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
    except Exception:
        return False


def create_jwt_token(user_id: str, role: str) -> str:
    """
    Create a signed JWT token for a user.

    Args:
        user_id: The user's unique ID.
        role:    The user's role ('coordinator' or 'player').

    Returns:
        A signed JWT token string.
    """
    payload = {
        "sub": user_id,
        "role": role,
        "iat": int(utc_now().timestamp()),
        "exp": int((utc_now() + timedelta(days=JWT_EXPIRE_DAYS)).timestamp()),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    FastAPI dependency — extract and validate the Bearer token.

    Args:
        authorization: The 'Authorization' HTTP header value.

    Returns:
        The user document from the database (without password hash).

    Raises:
        HTTPException 401: If the token is missing, invalid, or expired.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please log in again.")
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": payload["sub"]}, {"password_hash": 0, "_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def require_role(*allowed_roles: str):
    """
    FastAPI dependency factory — restrict an endpoint to specific roles.

    Usage:
        @router.get("/admin")
        async def admin_page(user = Depends(require_role("coordinator"))):
            ...
    """
    async def check_role(
        user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: {' or '.join(allowed_roles)}",
            )
        return user

    return check_role


def send_whatsapp_notification(phone: str, message: str) -> None:
    """
    Send a WhatsApp notification to a phone number.

    Currently logs the message. Replace with Twilio in production:
        from twilio.rest import Client
        client = Client(TWILIO_SID, TWILIO_TOKEN)
        client.messages.create(
            from_="whatsapp:+14155238886",
            body=message,
            to=f"whatsapp:{phone}"
        )
    """
    logger.info(f"[WhatsApp] To: {phone} | Message: {message}")


# ═════════════════════════════════════════════════════════════════════════════
# PYDANTIC MODELS (Request / Response Schemas)
# ═════════════════════════════════════════════════════════════════════════════

class UserRegister(BaseModel):
    """Data required to register a new user account."""
    name:     str
    email:    EmailStr
    password: str
    role:     str = "coordinator"   # 'coordinator' or 'player'
    phone:    Optional[str] = None


class UserLogin(BaseModel):
    """Credentials for logging in."""
    email:    EmailStr
    password: str


class AuctionCreate(BaseModel):
    """Data required to create a new auction."""
    name:             str
    sport:            str = "Cricket"
    date:             str
    base_price:       float = 100_000
    max_teams:        int   = 8
    budget_per_team:  float = 5_000_000
    description:      Optional[str] = None


class AuctionUpdate(BaseModel):
    """Fields that can be updated on an existing auction."""
    name:            Optional[str]   = None
    sport:           Optional[str]   = None
    date:            Optional[str]   = None
    base_price:      Optional[float] = None
    max_teams:       Optional[int]   = None
    budget_per_team: Optional[float] = None
    description:     Optional[str]   = None
    status:          Optional[str]   = None


class TeamCreate(BaseModel):
    """Data required to create a team inside an auction."""
    auction_id: str
    name:       str
    owner_name: str
    color:      str   = "#FF6B00"
    purse:      Optional[float] = None   # Defaults to auction's budget_per_team


class PlayerCreate(BaseModel):
    """Data required to register a player into an auction pool."""
    auction_id:     str
    name:           str
    role:           str   = "Batsman"
    sport:          str   = "Cricket"
    base_price:     float = 100_000
    city:           Optional[str] = None
    phone:          Optional[str] = None
    jersey_number:  Optional[int] = None
    bio:            Optional[str] = None
    photo_url:      Optional[str] = None


class PlayerUpdate(BaseModel):
    """Fields that can be updated on an existing player."""
    status:       Optional[str]   = None   # 'registered' | 'sold' | 'unsold'
    base_price:   Optional[float] = None
    photo_url:    Optional[str]   = None


class BidCreate(BaseModel):
    """Data required to place a bid in an auction."""
    auction_id: str
    player_id:  str
    team_id:    str
    amount:     float


class AuctionAction(BaseModel):
    """Generic action payload used by next/sold/unsold endpoints."""
    auction_id: str
    player_id:  str
    team_id:    Optional[str]   = None
    price:      Optional[float] = None


class ContactCreate(BaseModel):
    """Data for the public contact form."""
    name:    str
    email:   EmailStr
    message: str


class CheckoutCreate(BaseModel):
    """Data to create a Stripe checkout session."""
    package_name: str
    amount:       float   # Amount in INR (paisa will be computed server-side)
    success_url:  str
    cancel_url:   str


# ═════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@api_router.post("/auth/register", tags=["Auth"])
async def register_user(body: UserRegister):
    """
    Register a new user account.

    - Hashes the password before storing.
    - Returns a JWT token + user object on success.
    - Returns 400 if the email is already taken.
    """
    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    if body.role not in ("coordinator", "player"):
        raise HTTPException(status_code=400, detail="Role must be 'coordinator' or 'player'")

    user = {
        "id":            str(uuid.uuid4()),
        "name":          body.name,
        "email":         body.email,
        "password_hash": hash_password(body.password),
        "role":          body.role,
        "phone":         body.phone,
        "created_at":    utc_now().isoformat(),
    }
    await db.users.insert_one(user)

    token = create_jwt_token(user["id"], user["role"])
    user_public = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_public}


@api_router.post("/auth/login", tags=["Auth"])
async def login_user(body: UserLogin):
    """
    Log in with email and password.

    - Returns a JWT token + user object on success.
    - Returns 401 for wrong email/password (generic message to prevent enumeration).
    """
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_jwt_token(user["id"], user["role"])
    user_public = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": user_public}


@api_router.get("/auth/me", tags=["Auth"])
async def get_me(current_user: Dict = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


# ═════════════════════════════════════════════════════════════════════════════
# AUCTION ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@api_router.post("/auctions", tags=["Auctions"])
async def create_auction(
    body: AuctionCreate,
    coordinator = Depends(require_role("coordinator")),
):
    """
    Create a new auction (coordinator only).

    Returns the newly created auction document.
    """
    auction = {
        "id":               str(uuid.uuid4()),
        "coordinator_id":   coordinator["id"],
        "name":             body.name,
        "sport":            body.sport,
        "date":             body.date,
        "base_price":       body.base_price,
        "max_teams":        body.max_teams,
        "budget_per_team":  body.budget_per_team,
        "description":      body.description,
        "status":           "upcoming",
        "current_player_id": None,
        "current_bid":       0,
        "current_team_id":   None,
        "created_at":        utc_now().isoformat(),
    }
    await db.auctions.insert_one(auction)
    auction.pop("_id", None)
    return auction


@api_router.get("/auctions", tags=["Auctions"])
async def list_auctions(
    mine: Optional[str] = None,
    current_user: Dict = Depends(get_current_user),
):
    """
    List auctions.

    - If `?mine=true`, returns only the coordinator's own auctions.
    - Otherwise returns all auctions the user has access to.
    """
    query = {"coordinator_id": current_user["id"]} if mine == "true" else {}
    auctions = await db.auctions.find(query, {"_id": 0}).to_list(length=200)
    return auctions


@api_router.get("/auctions/public", tags=["Auctions"])
async def list_public_auctions():
    """
    List all active/upcoming auctions — no authentication required.
    Used by the player registration page.
    """
    query = {"status": {"$in": ["upcoming", "active"]}}
    auctions = await db.auctions.find(query, {"_id": 0}).to_list(length=200)
    return auctions


@api_router.get("/auctions/{auction_id}", tags=["Auctions"])
async def get_auction(
    auction_id: str,
    current_user: Dict = Depends(get_current_user),
):
    """Get a single auction by its ID."""
    auction = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


@api_router.put("/auctions/{auction_id}", tags=["Auctions"])
async def update_auction(
    auction_id: str,
    body: AuctionUpdate,
    coordinator = Depends(require_role("coordinator")),
):
    """Update an auction (coordinator who owns it only)."""
    auction = await db.auctions.find_one({"id": auction_id})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    if auction["coordinator_id"] != coordinator["id"]:
        raise HTTPException(status_code=403, detail="You do not own this auction")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.auctions.update_one({"id": auction_id}, {"$set": updates})
    return {"success": True}


@api_router.delete("/auctions/{auction_id}", tags=["Auctions"])
async def delete_auction(
    auction_id: str,
    coordinator = Depends(require_role("coordinator")),
):
    """
    Delete an auction and ALL related data (cascade).

    Deletes: teams, players, and bids associated with this auction.
    """
    auction = await db.auctions.find_one({"id": auction_id})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    if auction["coordinator_id"] != coordinator["id"]:
        raise HTTPException(status_code=403, detail="You do not own this auction")

    # Cascade delete
    await db.auctions.delete_one({"id": auction_id})
    await db.teams.delete_many({"auction_id": auction_id})
    await db.players.delete_many({"auction_id": auction_id})
    await db.bids.delete_many({"auction_id": auction_id})

    return {"success": True, "deleted_auction": auction_id}


# ═════════════════════════════════════════════════════════════════════════════
# TEAM ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@api_router.post("/teams", tags=["Teams"])
async def create_team(
    body: TeamCreate,
    coordinator = Depends(require_role("coordinator")),
):
    """
    Add a team to an auction.

    - Purse defaults to the auction's `budget_per_team` if not provided.
    - Returns 400 if the auction has reached its maximum team count.
    """
    auction = await db.auctions.find_one({"id": body.auction_id})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    if auction["coordinator_id"] != coordinator["id"]:
        raise HTTPException(status_code=403, detail="You do not own this auction")

    # Check team limit
    existing_count = await db.teams.count_documents({"auction_id": body.auction_id})
    if existing_count >= auction.get("max_teams", 8):
        raise HTTPException(
            status_code=400,
            detail=f"This auction already has the maximum of {auction['max_teams']} teams",
        )

    team = {
        "id":          str(uuid.uuid4()),
        "auction_id":  body.auction_id,
        "name":        body.name,
        "owner_name":  body.owner_name,
        "color":       body.color,
        "purse":       body.purse if body.purse is not None else auction["budget_per_team"],
        "squad_count": 0,
        "created_at":  utc_now().isoformat(),
    }
    await db.teams.insert_one(team)
    team.pop("_id", None)
    return team


@api_router.get("/teams", tags=["Teams"])
async def list_teams(
    auction_id: str,
    current_user: Dict = Depends(get_current_user),
):
    """List all teams in a given auction."""
    teams = await db.teams.find({"auction_id": auction_id}, {"_id": 0}).to_list(length=100)
    return teams


@api_router.delete("/teams/{team_id}", tags=["Teams"])
async def delete_team(
    team_id: str,
    coordinator = Depends(require_role("coordinator")),
):
    """Delete a team (coordinator only)."""
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    await db.teams.delete_one({"id": team_id})
    await db.bids.delete_many({"team_id": team_id})
    return {"success": True}


# ═════════════════════════════════════════════════════════════════════════════
# PLAYER ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@api_router.post("/players", tags=["Players"])
async def register_player(body: PlayerCreate):
    """
    Register a player into an auction pool.
    Public endpoint — no authentication required so players can self-register.
    """
    auction = await db.auctions.find_one({"id": body.auction_id})
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")

    player = {
        "id":           str(uuid.uuid4()),
        "auction_id":   body.auction_id,
        "name":         body.name,
        "role":         body.role,
        "sport":        body.sport,
        "base_price":   body.base_price,
        "city":         body.city,
        "phone":        body.phone,
        "jersey_number": body.jersey_number,
        "bio":          body.bio,
        "photo_url":    body.photo_url,
        "status":       "registered",   # registered | sold | unsold
        "sold_to_team": None,
        "sold_price":   None,
        "created_at":   utc_now().isoformat(),
    }
    await db.players.insert_one(player)
    player.pop("_id", None)
    return player


@api_router.get("/players", tags=["Players"])
async def list_players(
    auction_id: str,
    current_user: Dict = Depends(get_current_user),
):
    """List all players in a given auction."""
    players = await db.players.find(
        {"auction_id": auction_id}, {"_id": 0}
    ).to_list(length=500)
    return players


@api_router.put("/players/{player_id}", tags=["Players"])
async def update_player(
    player_id: str,
    body: PlayerUpdate,
    current_user: Dict = Depends(get_current_user),
):
    """Update a player's status or details."""
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.players.update_one({"id": player_id}, {"$set": updates})
    return {"success": True}


# ═════════════════════════════════════════════════════════════════════════════
# BIDDING ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@api_router.post("/auction/next", tags=["Live Auction"])
async def set_next_player(
    body: AuctionAction,
    coordinator = Depends(require_role("coordinator")),
):
    """
    Set the next player 'on the block' for bidding.
    Broadcasts a `next_player` Socket.IO event to all connected clients.
    """
    player = await db.players.find_one({"id": body.player_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Update auction state
    await db.auctions.update_one(
        {"id": body.auction_id},
        {"$set": {
            "current_player_id": body.player_id,
            "current_bid":       player["base_price"],
            "current_team_id":   None,
            "status":            "active",
        }},
    )

    # Broadcast to all watchers in the auction room
    await sio.emit(
        "next_player",
        {"player": player, "base_price": player["base_price"]},
        room=body.auction_id,
    )
    return {"success": True}


@api_router.post("/bids", tags=["Live Auction"])
async def place_bid(
    body: BidCreate,
    coordinator = Depends(require_role("coordinator")),
):
    """
    Place a bid for a team on the current player.

    - Validates that the bid amount exceeds the current bid.
    - Validates that the team has enough purse remaining.
    - Broadcasts a `bid` Socket.IO event with the updated bid info.
    """
    # Fetch related documents
    auction = await db.auctions.find_one({"id": body.auction_id})
    team    = await db.teams.find_one({"id": body.team_id}, {"_id": 0})
    player  = await db.players.find_one({"id": body.player_id}, {"_id": 0})

    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Business rule validations
    if body.amount <= auction.get("current_bid", 0):
        raise HTTPException(
            status_code=400,
            detail=f"Bid must be higher than the current bid of ₹{auction['current_bid']:,.0f}",
        )
    if team["purse"] < body.amount:
        raise HTTPException(
            status_code=400,
            detail=f"{team['name']} only has ₹{team['purse']:,.0f} purse remaining",
        )

    # Save bid record
    bid_record = {
        "id":         str(uuid.uuid4()),
        "auction_id": body.auction_id,
        "player_id":  body.player_id,
        "team_id":    body.team_id,
        "amount":     body.amount,
        "created_at": utc_now().isoformat(),
    }
    await db.bids.insert_one(bid_record)

    # Update auction's current bid state
    await db.auctions.update_one(
        {"id": body.auction_id},
        {"$set": {"current_bid": body.amount, "current_team_id": body.team_id}},
    )

    # Broadcast live bid to all watchers
    await sio.emit(
        "bid",
        {"bid": {k: v for k, v in bid_record.items() if k != "_id"}, "team": team},
        room=body.auction_id,
    )
    return {"success": True, "bid": bid_record["id"]}


@api_router.post("/auction/sold", tags=["Live Auction"])
async def mark_player_sold(
    body: AuctionAction,
    coordinator = Depends(require_role("coordinator")),
):
    """
    Mark the current player as SOLD to the winning team.

    - Deducts the final price from the team's purse.
    - Updates player status to 'sold'.
    - Increments the team's squad count.
    - Broadcasts a `sold` Socket.IO event.
    - Sends a WhatsApp notification to the player (if phone on file).
    """
    if not body.team_id or body.price is None:
        raise HTTPException(status_code=400, detail="team_id and price are required")

    player = await db.players.find_one({"id": body.player_id}, {"_id": 0})
    team   = await db.teams.find_one({"id": body.team_id}, {"_id": 0})

    if not player or not team:
        raise HTTPException(status_code=404, detail="Player or team not found")

    # Update player status
    await db.players.update_one(
        {"id": body.player_id},
        {"$set": {"status": "sold", "sold_to_team": body.team_id, "sold_price": body.price}},
    )

    # Deduct from team purse and increment squad size
    await db.teams.update_one(
        {"id": body.team_id},
        {"$inc": {"purse": -body.price, "squad_count": 1}},
    )

    # Reset auction state — ready for the next player
    await db.auctions.update_one(
        {"id": body.auction_id},
        {"$set": {"current_player_id": None, "current_bid": 0, "current_team_id": None}},
    )

    # Notify watchers
    await sio.emit(
        "sold",
        {"player": player, "team": team, "price": body.price},
        room=body.auction_id,
    )

    # WhatsApp notification
    if player.get("phone"):
        send_whatsapp_notification(
            phone=player["phone"],
            message=(
                f"🎉 Congratulations {player['name']}! "
                f"You've been SOLD to {team['name']} for ₹{body.price:,.0f}!"
            ),
        )

    return {"success": True}


@api_router.post("/auction/unsold", tags=["Live Auction"])
async def mark_player_unsold(
    body: AuctionAction,
    coordinator = Depends(require_role("coordinator")),
):
    """
    Mark the current player as UNSOLD.
    Broadcasts an `unsold` Socket.IO event.
    """
    await db.players.update_one(
        {"id": body.player_id},
        {"$set": {"status": "unsold"}},
    )
    await db.auctions.update_one(
        {"id": body.auction_id},
        {"$set": {"current_player_id": None, "current_bid": 0, "current_team_id": None}},
    )
    await sio.emit("unsold", {"player_id": body.player_id}, room=body.auction_id)
    return {"success": True}


# ═════════════════════════════════════════════════════════════════════════════
# DASHBOARD ROUTE
# ═════════════════════════════════════════════════════════════════════════════

@api_router.get("/dashboard/stats", tags=["Dashboard"])
async def get_dashboard_stats(coordinator = Depends(require_role("coordinator"))):
    """
    Return summary statistics for the coordinator's dashboard overview card.
    """
    coordinator_id = coordinator["id"]

    # Get all auction IDs owned by this coordinator
    auctions = await db.auctions.find(
        {"coordinator_id": coordinator_id}, {"id": 1, "_id": 0}
    ).to_list(length=500)
    auction_ids = [a["id"] for a in auctions]

    # Count stats in parallel
    active_count = await db.auctions.count_documents(
        {"coordinator_id": coordinator_id, "status": "active"}
    )
    player_count = await db.players.count_documents({"auction_id": {"$in": auction_ids}})

    # Sum revenue from completed payments
    revenue_cursor = db.payments.aggregate([
        {"$match": {"coordinator_id": coordinator_id, "payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ])
    revenue_result = await revenue_cursor.to_list(length=1)
    total_revenue  = revenue_result[0]["total"] if revenue_result else 0

    return {
        "total_auctions":  len(auction_ids),
        "active_auctions": active_count,
        "total_players":   player_count,
        "total_revenue":   total_revenue,
    }


# ═════════════════════════════════════════════════════════════════════════════
# FILE UPLOAD ROUTE
# ═════════════════════════════════════════════════════════════════════════════

@api_router.post("/uploads/image", tags=["Uploads"])
async def upload_image(
    file: UploadFile = File(...),
    current_user: Dict = Depends(get_current_user),
):
    """
    Upload a player or team photo.

    - Accepts: jpg, jpeg, png, webp, gif
    - Maximum size: 5 MB
    - Returns the URL path to the uploaded file.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: jpg, png, webp, gif",
        )

    # Read file and enforce size limit to prevent DoS
    contents = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large. Maximum allowed size is {MAX_UPLOAD_SIZE // 1024 // 1024} MB",
        )

    filename   = f"{uuid.uuid4().hex}{ext}"
    file_path  = UPLOAD_DIR / filename
    file_path.write_bytes(contents)

    return {
        "url":      f"/api/static/uploads/{filename}",
        "filename": filename,
    }


# ═════════════════════════════════════════════════════════════════════════════
# PAYMENTS (Stripe)
# ═════════════════════════════════════════════════════════════════════════════

@api_router.post("/checkout", tags=["Payments"])
async def create_checkout_session(
    body: CheckoutCreate,
    current_user: Dict = Depends(get_current_user),
):
    """
    Create a Stripe Checkout session for purchasing an auction package.

    Returns a URL to redirect the user to for payment.
    """
    if not stripe.api_key:
        raise HTTPException(
            status_code=503,
            detail="Payment processing is not configured. Contact the administrator.",
        )

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency":     "inr",
                    "product_data": {"name": body.package_name},
                    "unit_amount":  int(body.amount * 100),  # Convert to paisa
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            metadata={
                "user_id":      current_user["id"],
                "package_name": body.package_name,
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except stripe.error.StripeError as err:
        raise HTTPException(status_code=400, detail=str(err))


@api_router.post("/webhook/stripe", tags=["Payments"])
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.
    Called by Stripe when a payment is completed.
    Verifies the webhook signature to prevent spoofing.
    """
    payload   = await request.body()
    signature = request.headers.get("stripe-signature", "")

    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        # No webhook secret configured — accept without verification (dev only)
        event = json.loads(payload)

    # Handle successful payments
    if event["type"] == "checkout.session.completed":
        session  = event["data"]["object"]
        metadata = session.get("metadata", {})

        payment_record = {
            "id":             str(uuid.uuid4()),
            "session_id":     session["id"],
            "user_id":        metadata.get("user_id"),
            "coordinator_id": metadata.get("user_id"),
            "package_name":   metadata.get("package_name", "Unknown"),
            "amount":         session["amount_total"] / 100,  # Convert from paisa
            "currency":       session["currency"],
            "payment_status": "paid",
            "created_at":     utc_now().isoformat(),
        }
        await db.payments.insert_one(payment_record)
        logger.info(f"Payment recorded: {payment_record['session_id']}")

    return {"received": True}


@api_router.get("/payments", tags=["Payments"])
async def list_payments(current_user: Dict = Depends(get_current_user)):
    """Return payment history for the current user."""
    payments = await db.payments.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).to_list(length=100)
    return payments


# ═════════════════════════════════════════════════════════════════════════════
# PUBLIC ROUTES (No Auth Required)
# ═════════════════════════════════════════════════════════════════════════════

PACKAGES = [
    {"id": "starter",     "name": "Starter",     "price": 999,   "auctions": 1,  "teams": 4,  "features": ["1 Auction", "Up to 4 Teams", "50 Players", "Email Support"]},
    {"id": "pro",         "name": "Pro",          "price": 2999,  "auctions": 5,  "teams": 12, "features": ["5 Auctions", "Up to 12 Teams", "200 Players", "Priority Support", "Analytics"]},
    {"id": "enterprise",  "name": "Enterprise",   "price": 7999,  "auctions": 20, "teams": 20, "features": ["20 Auctions", "Unlimited Teams", "Unlimited Players", "Dedicated Support", "Custom Branding"]},
    {"id": "tournament",  "name": "Tournament",   "price": 14999, "auctions": -1, "teams": -1, "features": ["Unlimited Auctions", "Unlimited Teams", "Unlimited Players", "White Label", "API Access", "SLA Support"]},
]


@api_router.get("/packages", tags=["Public"])
async def list_packages():
    """Return available pricing packages — no auth required."""
    return PACKAGES


@api_router.post("/contact", tags=["Public"])
async def submit_contact(body: ContactCreate):
    """Save a contact form submission — no auth required."""
    record = {
        "id":         str(uuid.uuid4()),
        "name":       body.name,
        "email":      body.email,
        "message":    body.message,
        "created_at": utc_now().isoformat(),
    }
    await db.contact_messages.insert_one(record)
    return {"success": True, "id": record["id"]}


# ═════════════════════════════════════════════════════════════════════════════
# SOCKET.IO EVENTS
# ═════════════════════════════════════════════════════════════════════════════

@sio.event
async def connect(sid: str, environ: dict):
    """Called when a client connects via Socket.IO."""
    logger.info(f"[Socket.IO] Client connected: {sid}")


@sio.event
async def disconnect(sid: str):
    """Called when a client disconnects."""
    logger.info(f"[Socket.IO] Client disconnected: {sid}")


@sio.event
async def join_auction(sid: str, data: dict):
    """
    Join a specific auction room to receive live bid events.

    Clients must emit this after connecting:
        socket.emit('join_auction', { auction_id: '...' })
    """
    auction_id = data.get("auction_id")
    if auction_id:
        await sio.enter_room(sid, auction_id)
        logger.info(f"[Socket.IO] {sid} joined auction room: {auction_id}")


@sio.event
async def leave_auction(sid: str, data: dict):
    """Leave an auction room."""
    auction_id = data.get("auction_id")
    if auction_id:
        await sio.leave_room(sid, auction_id)


# ═════════════════════════════════════════════════════════════════════════════
# APP ASSEMBLY
# ═════════════════════════════════════════════════════════════════════════════

# Register all API routes under /api prefix
app.include_router(api_router)

# Wrap with Socket.IO for real-time support
# The final app handles both HTTP (FastAPI) and WebSocket (Socket.IO) traffic
combined_app = socketio.ASGIApp(sio, app)
