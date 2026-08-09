# AuctionPro — Environment & Secrets Setup Guide

## Overview
AuctionPro uses environment variables to configure database persistence, authentication secrets, payment gateway API keys, and security headers across local development and production cloud platforms (Vercel & Railway).

---

## Production Environment Variables

| Variable Name | Description | Example Placeholder | Required In |
|---|---|---|---|
| `PORT` | Node.js Express server port | `8000` | Railway / Backend |
| `MONGO_URL` | MongoDB Atlas TLS connection string | `mongodb+srv://user:pass@cluster.mongodb.net/auctionpro` | Railway / Backend |
| `JWT_SECRET` | Secret key for signing JWT tokens (min 32 characters) | `your_secure_32_char_jwt_secret_key` | Railway / Backend |
| `RAZORPAY_KEY_ID` | Razorpay Live/Test Key ID | `rzp_live_xxxxxxxxxxxxxx` | Railway / Backend |
| `RAZORPAY_KEY_SECRET` | Razorpay Live/Test Key Secret | `your_razorpay_api_secret_key` | Railway / Backend |
| `RAZORPAY_WEBHOOK_SECRET` | Secret key for verifying Razorpay webhook signatures | `your_razorpay_webhook_secret_key` | Railway / Backend |
| `FRONTEND_URL` | Live production frontend URL for CORS policy | `https://auctionpro-eight.vercel.app` | Railway / Backend |
| `CORS_ORIGINS` | Comma-separated list of allowed origins | `https://auctionpro-eight.vercel.app` | Railway / Backend |
| `REACT_APP_API_URL` | Railway backend API URL for React frontend | `https://auctionpro-backend-production.up.railway.app` | Vercel / Frontend |

---

## 🔒 Security Directives & Secret Management

1. **No Fallback Credentials**: Never commit database credentials, JWT secrets, or API keys directly to git repository files.
2. **MongoDB Credential Rotation**: If a database connection string was previously committed to git history, rotate the password immediately in MongoDB Atlas under *Security* -> *Database Access*.
3. **Razorpay Webhook Setup**:
   - Webhook URL: `https://YOUR_RAZORPAY_BACKEND_URL/api/payment/webhook`
   - Active Events: `payment.captured`, `order.paid`, `payment.failed`
   - Set the secret in `RAZORPAY_WEBHOOK_SECRET`.
