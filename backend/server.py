import os
import uuid
import logging
import shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Header
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from dotenv import load_dotenv

import json
import bcrypt
import jwt as pyjwt
import stripe
import socketio

# ------------- Env & DB -------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required — set a strong random secret.")
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

stripe.api_key = os.environ.get("STRIPE_API_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# ------------- Socket.IO -------------
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", logger=False, engineio_logger=False)

# ------------- FastAPI -------------
app = FastAPI(title="AuctionPro API")
api_router = APIRouter(prefix="/api")

_cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Security headers middleware
from starlette.middleware.base import BaseHTTPMiddleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
app.add_middleware(SecurityHeadersMiddleware)

# Static uploads
app.mount("/api/static/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ==================== HELPERS ====================
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def _verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def _create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "iat": int(now_utc().timestamp()),
        "exp": int((now_utc() + timedelta(days=7)).timestamp()),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except pyjwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.users.find_one({"id": payload["sub"]}, {"password_hash": 0, "_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_role(*roles: str):
    async def dep(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user.get("role") not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return dep


def clean_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


# ==================== MODELS ====================
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = Field(pattern="^(coordinator|player)$")
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str


class DemoCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    organization: Optional[str] = None
    sport: Optional[str] = None


class AuctionCreate(BaseModel):
    name: str
    sport: str
    date: str
    base_price: float = 0
    max_teams: int = 8
    budget_per_team: float = 1000000
    logo_url: Optional[str] = None
    description: Optional[str] = None


class AuctionUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = None
    date: Optional[str] = None
    base_price: Optional[float] = None
    max_teams: Optional[int] = None
    budget_per_team: Optional[float] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class TeamCreate(BaseModel):
    auction_id: str
    name: str
    owner_name: str
    logo_url: Optional[str] = None
    color: Optional[str] = "#FF6B00"
    purse: Optional[float] = None  # falls back to auction budget


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    logo_url: Optional[str] = None
    color: Optional[str] = None
    purse: Optional[float] = None


class PlayerCreate(BaseModel):
    auction_id: str
    name: str
    photo_url: Optional[str] = None
    sport: Optional[str] = None
    role: str
    base_price: float = 100000
    city: Optional[str] = None
    phone: Optional[str] = None
    jersey_number: Optional[int] = None
    bio: Optional[str] = None


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    photo_url: Optional[str] = None
    role: Optional[str] = None
    base_price: Optional[float] = None
    status: Optional[str] = None
    sold_price: Optional[float] = None
    team_id: Optional[str] = None


class BidCreate(BaseModel):
    auction_id: str
    player_id: str
    team_id: str
    amount: float


class CheckoutBody(BaseModel):
    package_id: str
    origin_url: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None


# ==================== PACKAGES ====================
PACKAGES: Dict[str, Dict] = {
    "starter": {"name": "Starter", "amount": 0.0, "teams": 2, "features": ["Basic Auction", "Up to 2 Teams", "Community Support"]},
    "pro":     {"name": "Pro",     "amount": 3000.0, "teams": 4,  "features": ["Live Streaming Overlay", "Team Owner View", "Up to 4 Teams", "Email Support"]},
    "premium": {"name": "Premium", "amount": 4000.0, "teams": 8,  "features": ["Remote Bidding", "Fortune Wheel", "Up to 8 Teams", "Priority Support", "WhatsApp Notifications"]},
    "elite":   {"name": "Elite",   "amount": 5000.0, "teams": 12, "features": ["All Premium Features", "Auto Social Post", "Up to 12 Teams", "24/7 Support", "Custom Themes"]},
}


# ==================== ROOT ====================
@api_router.get("/")
async def root():
    return {"message": "AuctionPro API", "version": "2.0"}


@api_router.get("/packages")
async def get_packages():
    return [{"id": k, **v} for k, v in PACKAGES.items()]


# ==================== AUTH ====================
@api_router.post("/auth/register")
async def register(body: UserRegister):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": body.name,
        "email": body.email.lower(),
        "phone": body.phone,
        "role": body.role,
        "password_hash": _hash_password(body.password),
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(doc)
    token = _create_token(user_id, body.role)
    return {"token": token, "user": {"id": user_id, "name": body.name, "email": body.email.lower(), "role": body.role, "phone": body.phone}}


@api_router.post("/auth/login")
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not _verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = _create_token(user["id"], user["role"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"], "phone": user.get("phone")}}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": user}


@api_router.post("/auth/logout")
async def logout():
    return {"success": True}


# ==================== UPLOADS ====================
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB

@api_router.post("/uploads/image")
async def upload_image(file: UploadFile = File(...), user=Depends(get_current_user)):
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed:
        raise HTTPException(400, "Only jpg/png/webp/gif supported")
    # Read with size cap to prevent DoS
    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large. Maximum size is 5 MB.")
    fname = f"{uuid.uuid4().hex}{ext}"
    fpath = UPLOAD_DIR / fname
    fpath.write_bytes(contents)
    return {"url": f"/api/static/uploads/{fname}", "filename": fname}


# ==================== CONTACT / DEMO (public) ====================
@api_router.post("/contact")
async def submit_contact(body: ContactCreate):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_utc().isoformat()}
    await db.contact_messages.insert_one(doc)
    return {"success": True, "id": doc["id"]}


@api_router.post("/demo")
async def submit_demo(body: DemoCreate):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_utc().isoformat()}
    await db.demo_requests.insert_one(doc)
    return {"success": True, "id": doc["id"], "message": "Demo request received. Our team will call you within 24 hours."}


# ==================== AUCTIONS ====================
@api_router.get("/auctions")
async def list_auctions(mine: bool = False, user_hdr: Optional[str] = Header(None, alias="Authorization")):
    query: Dict[str, Any] = {}
    if mine:
        try:
            user = await get_current_user(user_hdr)
            query["coordinator_id"] = user["id"]
        except HTTPException:
            return []
    rows = await db.auctions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api_router.get("/auctions/public")
async def list_public_auctions():
    rows = await db.auctions.find({"status": {"$in": ["open", "live"]}}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rows


@api_router.get("/auctions/{auction_id}")
async def get_auction(auction_id: str):
    doc = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Auction not found")
    return doc


@api_router.post("/auctions")
async def create_auction(body: AuctionCreate, user=Depends(require_role("coordinator"))):
    doc = {
        "id": str(uuid.uuid4()),
        "coordinator_id": user["id"],
        "coordinator_name": user["name"],
        **body.model_dump(),
        "status": "open",
        "current_player_id": None,
        "current_bid": 0,
        "current_team_id": None,
        "created_at": now_utc().isoformat(),
        "updated_at": now_utc().isoformat(),
    }
    await db.auctions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/auctions/{auction_id}")
async def update_auction(auction_id: str, body: AuctionUpdate, user=Depends(require_role("coordinator"))):
    existing = await db.auctions.find_one({"id": auction_id})
    if not existing or existing["coordinator_id"] != user["id"]:
        raise HTTPException(404, "Auction not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    updates["updated_at"] = now_utc().isoformat()
    await db.auctions.update_one({"id": auction_id}, {"$set": updates})
    doc = await db.auctions.find_one({"id": auction_id}, {"_id": 0})
    return doc


@api_router.delete("/auctions/{auction_id}")
async def delete_auction(auction_id: str, user=Depends(require_role("coordinator"))):
    existing = await db.auctions.find_one({"id": auction_id})
    if not existing or existing["coordinator_id"] != user["id"]:
        raise HTTPException(404, "Auction not found")
    await db.auctions.delete_one({"id": auction_id})
    await db.teams.delete_many({"auction_id": auction_id})
    await db.players.delete_many({"auction_id": auction_id})
    await db.bids.delete_many({"auction_id": auction_id})
    return {"success": True}


# ==================== TEAMS ====================
@api_router.get("/teams")
async def list_teams(auction_id: Optional[str] = None):
    q = {}
    if auction_id:
        q["auction_id"] = auction_id
    rows = await db.teams.find(q, {"_id": 0}).sort("created_at", 1).to_list(500)
    return rows


@api_router.post("/teams")
async def create_team(body: TeamCreate, user=Depends(require_role("coordinator"))):
    auction = await db.auctions.find_one({"id": body.auction_id})
    if not auction or auction["coordinator_id"] != user["id"]:
        raise HTTPException(404, "Auction not found")
    purse = body.purse if body.purse is not None else auction.get("budget_per_team", 1000000)
    doc = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "purse": purse,
        "original_purse": purse,
        "spent": 0.0,
        "squad_count": 0,
        "created_at": now_utc().isoformat(),
    }
    await db.teams.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/teams/{team_id}")
async def update_team(team_id: str, body: TeamUpdate, user=Depends(require_role("coordinator"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.teams.update_one({"id": team_id}, {"$set": updates})
    return await db.teams.find_one({"id": team_id}, {"_id": 0})


@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user=Depends(require_role("coordinator"))):
    await db.teams.delete_one({"id": team_id})
    return {"success": True}


# ==================== PLAYERS ====================
@api_router.get("/players")
async def list_players(auction_id: Optional[str] = None, status: Optional[str] = None):
    q: Dict[str, Any] = {}
    if auction_id:
        q["auction_id"] = auction_id
    if status:
        q["status"] = status
    rows = await db.players.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return rows


@api_router.post("/players")
async def create_player(body: PlayerCreate, authorization: Optional[str] = Header(None)):
    # Public registration allowed (players can self-register). If token present, attach user_id.
    auction = await db.auctions.find_one({"id": body.auction_id})
    if not auction:
        raise HTTPException(404, "Auction not found")
    user_id = None
    if authorization:
        try:
            u = await get_current_user(authorization)
            user_id = u["id"]
        except HTTPException:
            user_id = None
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        **body.model_dump(),
        "status": "registered",
        "sold_price": None,
        "team_id": None,
        "created_at": now_utc().isoformat(),
    }
    await db.players.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/players/me")
async def my_players(user=Depends(get_current_user)):
    rows = await db.players.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return rows


@api_router.put("/players/{player_id}")
async def update_player(player_id: str, body: PlayerUpdate, user=Depends(require_role("coordinator"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.players.update_one({"id": player_id}, {"$set": updates})
    return await db.players.find_one({"id": player_id}, {"_id": 0})


@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str, user=Depends(require_role("coordinator"))):
    await db.players.delete_one({"id": player_id})
    return {"success": True}


# ==================== BIDS / AUCTION ROOM ACTIONS ====================
@api_router.get("/bids")
async def list_bids(auction_id: Optional[str] = None, player_id: Optional[str] = None):
    q = {}
    if auction_id:
        q["auction_id"] = auction_id
    if player_id:
        q["player_id"] = player_id
    rows = await db.bids.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api_router.post("/bids")
async def place_bid(body: BidCreate, user=Depends(get_current_user)):
    auction = await db.auctions.find_one({"id": body.auction_id}, {"_id": 0})
    if not auction:
        raise HTTPException(404, "Auction not found")
    team = await db.teams.find_one({"id": body.team_id}, {"_id": 0})
    if not team or team.get("purse", 0) < body.amount:
        raise HTTPException(400, "Team purse insufficient")
    bid = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "user_id": user["id"],
        "created_at": now_utc().isoformat(),
    }
    await db.bids.insert_one(dict(bid))
    await db.auctions.update_one(
        {"id": body.auction_id},
        {"$set": {"current_bid": body.amount, "current_team_id": body.team_id, "current_player_id": body.player_id, "updated_at": now_utc().isoformat()}},
    )
    # Broadcast (strip _id if insert_one mutated)
    bid.pop("_id", None)
    team.pop("_id", None) if isinstance(team, dict) else None
    await sio.emit("bid", {"bid": bid, "team": team}, room=f"auction:{body.auction_id}")
    return {"success": True, "bid": bid}


class SoldBody(BaseModel):
    auction_id: str
    player_id: str
    team_id: str
    price: float


@api_router.post("/auction/sold")
async def mark_sold(body: SoldBody, user=Depends(require_role("coordinator"))):
    await db.players.update_one({"id": body.player_id}, {"$set": {"status": "sold", "sold_price": body.price, "team_id": body.team_id}})
    await db.teams.update_one(
        {"id": body.team_id},
        {"$inc": {"purse": -body.price, "spent": body.price, "squad_count": 1}},
    )
    team = await db.teams.find_one({"id": body.team_id}, {"_id": 0})
    player = await db.players.find_one({"id": body.player_id}, {"_id": 0})
    await sio.emit("sold", {"player": player, "team": team, "price": body.price}, room=f"auction:{body.auction_id}")
    logger.info(f"[MOCK WHATSAPP] Sent SOLD notification to {player.get('phone')} - {player.get('name')} sold to {team.get('name')} for {body.price}")
    return {"success": True, "team": team, "player": player}


class UnsoldBody(BaseModel):
    auction_id: str
    player_id: str


@api_router.post("/auction/unsold")
async def mark_unsold(body: UnsoldBody, user=Depends(require_role("coordinator"))):
    await db.players.update_one({"id": body.player_id}, {"$set": {"status": "unsold", "sold_price": None, "team_id": None}})
    player = await db.players.find_one({"id": body.player_id}, {"_id": 0})
    await sio.emit("unsold", {"player": player}, room=f"auction:{body.auction_id}")
    return {"success": True}


class NextPlayerBody(BaseModel):
    auction_id: str
    player_id: str


@api_router.post("/auction/next")
async def next_player(body: NextPlayerBody, user=Depends(require_role("coordinator"))):
    player = await db.players.find_one({"id": body.player_id}, {"_id": 0})
    if not player:
        raise HTTPException(404, "Player not found")
    await db.auctions.update_one(
        {"id": body.auction_id},
        {"$set": {"current_player_id": body.player_id, "current_bid": player.get("base_price", 0), "current_team_id": None}},
    )
    await sio.emit("next_player", {"player": player, "base_price": player.get("base_price", 0)}, room=f"auction:{body.auction_id}")
    return {"success": True, "player": player}


# ==================== COORDINATOR STATS ====================
@api_router.get("/dashboard/stats")
async def dashboard_stats(user=Depends(require_role("coordinator"))):
    my_auctions = await db.auctions.count_documents({"coordinator_id": user["id"]})
    active_auctions = await db.auctions.count_documents({"coordinator_id": user["id"], "status": {"$in": ["open", "live"]}})
    auction_ids = [a["id"] async for a in db.auctions.find({"coordinator_id": user["id"]}, {"id": 1})]
    total_players = await db.players.count_documents({"auction_id": {"$in": auction_ids}}) if auction_ids else 0
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    agg = await db.payment_transactions.aggregate(pipeline).to_list(1)
    total_revenue = agg[0]["total"] if agg else 0
    return {
        "total_auctions": my_auctions,
        "active_auctions": active_auctions,
        "total_players": total_players,
        "total_revenue": total_revenue,
    }


# ==================== STRIPE PAYMENTS ====================
@api_router.get("/payments")
async def list_payments(user=Depends(require_role("coordinator"))):
    rows = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api_router.post("/payments/checkout")
async def create_checkout(body: CheckoutBody, request: Request):
    if body.package_id not in PACKAGES:
        raise HTTPException(400, "Invalid package")
    pkg = PACKAGES[body.package_id]
    if pkg["amount"] <= 0:
        raise HTTPException(400, "Free package does not require checkout")

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/payment/cancel"

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "inr",
                    "product_data": {"name": f"AuctionPro {pkg['name']} Plan"},
                    "unit_amount": int(pkg["amount"] * 100),
                },
                "quantity": 1,
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "package_id": body.package_id,
                "package_name": pkg["name"],
                "customer_name": body.customer_name or "",
                "customer_email": body.customer_email or "",
            },
        )
    except stripe.error.StripeError as e:
        logger.exception("Stripe checkout failed: %s", e)
        raise HTTPException(500, "Payment processor error. Please try again.")

    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "package_id": body.package_id,
        "package_name": pkg["name"],
        "amount": float(pkg["amount"]),
        "currency": "inr",
        "customer_name": body.customer_name,
        "customer_email": body.customer_email,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": now_utc().isoformat(),
        "updated_at": now_utc().isoformat(),
    })
    return {"checkout_url": session.url, "session_id": session.id}


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            s = stripe.checkout.Session.retrieve(session_id)
            if s.payment_status == "paid" or s.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now_utc().isoformat()}},
                )
                record = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        except stripe.error.StripeError:
            pass
    return {
        "session_id": record["session_id"],
        "status": record["status"],
        "payment_status": record["payment_status"],
        "amount": record.get("amount"),
        "currency": record.get("currency"),
        "package_name": record.get("package_name"),
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        else:
            import json as _json
            event = _json.loads(payload.decode())
    except Exception as e:
        logger.exception("Webhook err: %s", e)
        raise HTTPException(400, "Webhook error")

    t = event.get("type") if isinstance(event, dict) else event["type"]
    obj = event["data"]["object"] if isinstance(event, dict) else event["data"]["object"]

    if t == "checkout.session.completed":
        await db.payment_transactions.update_one(
            {"session_id": obj["id"], "payment_status": {"$ne": "paid"}},
            {"$set": {"status": "completed", "payment_status": obj.get("payment_status", "paid"), "updated_at": now_utc().isoformat()}},
        )
    return {"status": "ok"}


# ==================== SOCKET.IO EVENTS ====================
@sio.event
async def connect(sid, environ, auth):
    logger.info(f"Socket connected: {sid}")


@sio.event
async def disconnect(sid):
    logger.info(f"Socket disconnected: {sid}")


@sio.on("join_auction")
async def join_auction(sid, data):
    auction_id = data.get("auction_id")
    if auction_id:
        await sio.enter_room(sid, f"auction:{auction_id}")
        await sio.emit("joined", {"auction_id": auction_id}, to=sid)


@sio.on("leave_auction")
async def leave_auction(sid, data):
    auction_id = data.get("auction_id")
    if auction_id:
        await sio.leave_room(sid, f"auction:{auction_id}")


@sio.on("remote_bid")
async def remote_bid(sid, data):
    """Owner-mobile clients push bid intent; the coordinator UI listens and can call /api/bids."""
    auction_id = data.get("auction_id")
    if auction_id:
        await sio.emit("remote_bid", data, room=f"auction:{auction_id}")


# ==================== MOUNT ====================
app.include_router(api_router)

# Wrap FastAPI with Socket.IO ASGI app - Socket.IO at /socket.io
socket_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")


@app.on_event("shutdown")
async def shutdown_db():
    client.close()


# The ASGI entrypoint used by uvicorn (supervisor calls `server:app`)
# so we re-export socket_app under name `app`.
app = socket_app  # type: ignore
