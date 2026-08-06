from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse, CheckoutStatusResponse,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AuctionPro API")
api_router = APIRouter(prefix="/api")

# ------------- Pricing packages (server-side, never trust frontend) -------------
PACKAGES: Dict[str, Dict] = {
    "starter": {"name": "Starter", "amount": 0.0, "teams": 2, "features": ["Basic Auction", "Up to 2 Teams", "Community Support"]},
    "pro":     {"name": "Pro",     "amount": 3000.0, "teams": 4,  "features": ["Live Streaming Overlay", "Team Owner View", "Up to 4 Teams", "Email Support"]},
    "premium": {"name": "Premium", "amount": 4000.0, "teams": 8,  "features": ["Remote Bidding", "Fortune Wheel", "Up to 8 Teams", "Priority Support", "WhatsApp Notifications"]},
    "elite":   {"name": "Elite",   "amount": 5000.0, "teams": 12, "features": ["All Premium Features", "Auto Social Post", "Up to 12 Teams", "24/7 Support", "Custom Themes"]},
}

# ------------- Models -------------
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ContactMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str

class DemoRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: str
    organization: Optional[str] = None
    sport: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DemoRequestCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    organization: Optional[str] = None
    sport: Optional[str] = None

class CheckoutBody(BaseModel):
    package_id: str
    origin_url: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None

# ------------- Routes -------------
@api_router.get("/")
async def root():
    return {"message": "AuctionPro API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    obj = StatusCheck(**input.dict())
    await db.status_checks.insert_one(obj.dict())
    return obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**r) for r in rows]

@api_router.get("/packages")
async def get_packages():
    return [{"id": k, **v} for k, v in PACKAGES.items()]

@api_router.post("/contact")
async def submit_contact(body: ContactMessageCreate):
    obj = ContactMessage(**body.dict())
    await db.contact_messages.insert_one(obj.dict())
    return {"success": True, "id": obj.id}

@api_router.post("/demo")
async def submit_demo(body: DemoRequestCreate):
    obj = DemoRequest(**body.dict())
    await db.demo_requests.insert_one(obj.dict())
    return {"success": True, "id": obj.id, "message": "Demo request received. Our team will call you within 24 hours."}

# ------------- Stripe (Flow B) -------------
def _stripe(request: Request) -> StripeCheckout:
    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    return StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)

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

    stripe_checkout = _stripe(request)
    req = CheckoutSessionRequest(
        amount=float(pkg["amount"]),
        currency="inr",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "package_id": body.package_id,
            "package_name": pkg["name"],
            "customer_name": body.customer_name or "",
            "customer_email": body.customer_email or "",
        },
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "package_id": body.package_id,
        "package_name": pkg["name"],
        "amount": float(pkg["amount"]),
        "currency": "inr",
        "customer_name": body.customer_name,
        "customer_email": body.customer_email,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_status(session_id: str, request: Request):
    record = await db.payment_transactions.find_one({"session_id": session_id})
    if not record:
        raise HTTPException(404, "Transaction not found")
    if record.get("payment_status") != "paid":
        try:
            stripe_checkout = _stripe(request)
            status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
            if status.payment_status == "paid" or status.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne": "paid"}},
                    {"$set": {"status": "completed", "payment_status": "paid",
                              "updated_at": datetime.now(timezone.utc)}},
                )
                record = await db.payment_transactions.find_one({"session_id": session_id})
        except Exception as e:
            logging.exception("Stripe status err: %s", e)
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
    body_bytes = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        stripe_checkout = _stripe(request)
        webhook_response = await stripe_checkout.handle_webhook(body_bytes, sig)
    except Exception as e:
        logging.exception("webhook err %s", e)
        raise HTTPException(400, "webhook error")
    if webhook_response.session_id:
        await db.payment_transactions.update_one(
            {"session_id": webhook_response.session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {
                "status": "completed" if webhook_response.payment_status == "paid" else webhook_response.payment_status,
                "payment_status": webhook_response.payment_status,
                "updated_at": datetime.now(timezone.utc),
            }},
        )
    return {"status": "ok"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
