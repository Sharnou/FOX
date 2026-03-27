# XTOX Marketplace v2.0 🛒

An AI-powered, multi-country local marketplace — Egypt-first, Arabic dialect-aware, with WebRTC voice calls, image analysis, offline category detection, and a full admin panel with AI repair engine.

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Ad Generator | Take a photo → GPT-4o-mini analyzes it → auto-fills title, description, category, price |
| 🎤 Whisper Voice | Record voice → transcribed to text for ad creation |
| 👁 GPT-4o Vision | Image analysis for product identification |
| 🌍 Multi-Country | EG, SA, AE, DE, US, GB, JO, LY, MA + auto-create new countries |
| 🗺 Offline Dialect | Egyptian Arabic dialect detection without internet |
| 💬 Real-time Chat | Socket.io encrypted messaging |
| 📞 WebRTC Voice | In-app voice calls (no Twilio needed) |
| ⭐ Featured Ads | Normal (border) + Cartoon (animated ✨) styles |
| 💳 Stripe Payments | Featured ad boosts ($5 normal / $8 cartoon) |
| 🛒 Supermarket | Grocery shopping section |
| 💊 Pharmacy | Medicine listings with expiry warnings |
| 🍕 Fast Food | Restaurant delivery section |
| 💼 Jobs | Job listings with chat-to-apply |
| 🔨 Services | Worker marketplace (plumber, electrician, etc.) |
| 📊 Admin Panel | Ban, mute, feature, rank, broadcast, backup |
| 🤖 AI Repair Engine | Admin requests AI to fix system issues (30-min limit) |
| 📡 RSS Feed | Per-country RSS at `/rss/:country` |
| 📱 QR Code | Each ad gets a QR code for sharing |
| 🔑 Key Failover | Multiple OpenAI keys, auto-rotate on failure |
| 📦 Archive System | Ads expire after 30 days, cleaned after 7 days |
| 🔒 Fraud Detection | Block 3+ accounts from same IP |
| 📢 Weekly Broadcast | Push notification to all users (1/week limit) |
| 💾 DB Backup | Zip MongoDB collections on demand |
| 🎉 Celebrations | Auto-detect holidays per country (Ramadan, Eid, etc.) |

---

## 📁 Project Structure

```
xtox/
├── backend/          # Node.js + Express + Socket.io
│   ├── server/       # Core modules (AI, payment, search, etc.)
│   ├── models/       # MongoDB schemas
│   ├── middleware/   # JWT auth
│   └── routes/       # REST API endpoints
└── frontend/         # Next.js 14 App Router
    └── app/          # Pages + components
```

---

## ⚙️ Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Upstash Redis URL |
| `JWT_SECRET` | Min 32 chars secret |
| `ENCRYPTION_KEY` | Exactly 32 chars for AES-256 |
| `OPENAI_API_KEY` | Primary OpenAI key |
| `AI_KEYS` | Comma-separated failover keys |
| `STRIPE_SECRET` | Stripe secret key |
| `FRONTEND_URL` | Vercel deployment URL |
| `CLOUD_NAME` | Cloudinary cloud name |
| `CLOUD_KEY` | Cloudinary API key |
| `CLOUD_SECRET` | Cloudinary API secret |
| `ELASTIC_URL` | Elasticsearch endpoint (optional) |
| `SENTRY_DSN` | Sentry error tracking (optional) |
| `FIREBASE_PROJECT_ID` | Firebase for push notifications |

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-backend.railway.app
```

---

## 🚀 Setup & Deployment

### Backend (Railway)

```bash
cd backend
npm install
# Set environment variables in Railway dashboard
npm start
```

### Frontend (Vercel)

```bash
cd frontend
npm install
# Set NEXT_PUBLIC_API_URL in Vercel dashboard
npm run build
```

### Local Development

```bash
# Terminal 1 — Backend
cd backend && cp .env.example .env && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/users/register` | ❌ | Email registration |
| POST | `/api/users/login` | ❌ | Login |
| POST | `/api/users/send-otp` | ❌ | Phone OTP |
| POST | `/api/users/verify-otp` | ❌ | Verify OTP + login |
| GET | `/api/ads?country=EG` | ❌ | List ads |
| GET | `/api/ads/:id` | ❌ | Ad detail + QR |
| POST | `/api/ads` | ✅ | Create ad |
| POST | `/api/ads/ai-generate` | ✅ | AI ad generation |
| DELETE | `/api/ads/:id` | ✅ | Delete own ad |
| GET | `/api/jobs?country=EG` | ❌ | Job listings |
| GET | `/api/services?country=EG` | ❌ | Service listings |
| GET | `/api/supermarket?country=EG` | ❌ | Supermarket items |
| GET | `/api/pharmacy?country=EG` | ❌ | Pharmacy items |
| GET | `/api/fastfood?country=EG` | ❌ | Fast food items |
| GET | `/api/chat` | ✅ | User chats |
| POST | `/api/chat/start` | ✅ | Start chat |
| GET | `/api/admin/users` | 🛡 | List users |
| POST | `/api/admin/ban` | 🛡 | Ban user |
| POST | `/api/admin/feature` | 🛡 | Feature ad |
| POST | `/api/admin/broadcast` | 🛡 | Weekly broadcast |
| POST | `/api/admin/backup` | 🛡 | Download DB backup |
| POST | `/api/admin/fix-categories` | 🛡 | AI category fix |
| POST | `/api/admin/ai-repair/request` | 🛡 | Request AI repair |
| GET | `/rss/:country` | ❌ | RSS feed |

---

## 🧠 AI Architecture

```
User Photo/Voice
      ↓
  vision.js (GPT-4o-mini) → image description
  whisper.js (Whisper-1) → voice transcript
      ↓
  ai.js → combines all inputs
      ↓
  offlineDict.js → dialect-aware category detection (no API)
      ↓
  aiGenerator.js → full ad JSON (title, desc, category, price, hashtags)
```

---

## 🔑 Key Failover System

```js
AI_KEYS=sk-key1,sk-key2,sk-key3
```
Keys are tried in sequence. On failure, auto-rotates. All AI calls use `callWithFailover()`.

---

## 📜 License

MIT — Built for Egypt 🇪🇬 and the Arab world 🌍
