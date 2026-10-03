# REACHLO — Team Developer Guide

> A hyperlocal advertising platform connecting local businesses (Sellers) with potential buyers through AI-generated ad campaigns.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Application Workflow](#4-application-workflow)
5. [API Keys & Environment Variables](#5-api-keys--environment-variables)
6. [Local Development Setup](#6-local-development-setup)
7. [Folder Structure](#7-folder-structure)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Known Issues & Tips](#9-known-issues--tips)

---

## 1. Project Overview

REACHLO is a mobile application built with React Native (Expo) on the frontend and Python FastAPI on the backend. It has two user roles:

| Role | Description |
|---|---|
| **Seller** | A local business owner who creates ad campaigns, uses AI to generate campaign content and thumbnail images, and tracks buyer leads |
| **Buyer** | A local consumer who discovers nearby campaigns/deals, views them, and contacts sellers via WhatsApp, Call, or Link |

---

## 2. Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React Native + Expo** | Cross-platform mobile app (Android & iOS) |
| **Expo Go** | App used for local testing via QR code (no build needed) |
| **React Navigation** | Screen navigation (Stack + Tab navigators) |
| **AsyncStorage** | Storing JWT auth token locally on device |
| **Expo Location** | Fetching buyer's GPS coordinates for nearby campaigns |
| **Expo Image Picker** | Selecting images from device for campaign creation |

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.11** | Backend language |
| **FastAPI** | REST API framework |
| **Uvicorn** | ASGI server with hot-reload for development |
| **SQLAlchemy 2.0** | ORM for database interactions |
| **PyMySQL** | MySQL database driver for SQLAlchemy |
| **PyJWT** | JSON Web Token creation and verification |
| **Passlib + Bcrypt** | Secure password hashing |
| **Google Gemini API** | AI text generation for campaign copy |
| **Ideogram API** | AI image generation for campaign thumbnails (currently expired — falling back to Pollinations) |
| **Pollinations AI** | Free fallback image generator (no API key needed) |
| **Google Places API** | Location autocomplete for campaign location selection |
| **Google Maps Geocoding API** | Converting GPS coordinates to human-readable address |

### Database & Cloud
| Technology | Purpose |
|---|---|
| **TiDB Serverless** | Cloud MySQL-compatible database (shared by all team members — FREE) |
| **Render** *(optional — not yet set up)* | For hosting the backend publicly |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Mobile App                          │
│  React Native + Expo (Android / iOS)                    │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  Buyer UI    │    │  Seller UI   │                  │
│  │  (Discovery, │    │  (Dashboard, │                  │
│  │   Campaigns) │    │   AI, Leads) │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
└─────────┼─────────────────── ┼─────────────────────────┘
          │  HTTP Requests      │
          ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│              Python FastAPI Backend                     │
│  Running on http://YOUR_IP:8000 (local dev)            │
│                                                         │
│  /api/auth       — Login, Register, Profile             │
│  /api/campaigns  — CRUD for campaigns, nearby feed      │
│  /api/ai         — AI campaign + image generation       │
│  /api/businesses — Business profile management          │
│  /api/leads      — Buyer contact tracking               │
│  /api/uploads    — Static file serving (images)         │
└──────────────────────────┬──────────────────────────────┘
                           │ SQLAlchemy + PyMySQL (SSL)
                           ▼
┌─────────────────────────────────────────────────────────┐
│   TiDB Cloud (MySQL-compatible) — Shared Cloud DB      │
│   gateway01.ap-southeast-1.prod.aws.tidbcloud.com      │
│   Port: 4000  |  Database: reachlo_db                  │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Application Workflow

### Buyer Flow

1. **Splash → Onboarding** — Shown on first launch only.
2. **Landing Screen** — Choose to sign in as Buyer or Seller.
3. **Buyer Login / Register** — Phone + OTP or Email + Password.
4. **Discovery Feed** — The main buyer home screen. Shows:
   - **"Offers Near You"** — Campaigns within 10 km of the buyer's GPS location (sorted by distance).
   - **"In Chennai"** (or buyer's city) — Active campaigns filtered by city.
   - **Categories** — Browse campaigns by type (Food, Fashion, etc.)
5. **Campaign Detail Screen** — Full ad view. Buyer can:
   - Call the seller
   - Message via WhatsApp
   - Open a custom link
   - Save the campaign
6. **Buyer Profile** — View saved campaigns and account info.

### Seller Flow

1. **Landing → Seller Login / Register (Step 1 & 2)**
   - Step 1: Name, email, phone, password.
   - Step 2: Business name, category, description, city, WhatsApp number.
2. **Seller Dashboard** — The main seller home screen. Shows:
   - Active campaigns list with view/lead counts.
   - Quick actions: Create Campaign, AI Generate.
3. **AI Campaign Generation** — Seller provides a topic/product. The backend:
   - Calls **Google Gemini** to write the campaign title, description, and offer.
   - Calls **Ideogram** (or **Pollinations** as fallback) to generate a professional ad thumbnail image.
   - Returns an AI Draft for the seller to review.
4. **AI Draft Review** — Seller can edit the AI-generated content before publishing.
5. **Manual Campaign Creation** — Traditional form-based creation.
6. **Leads** — Sellers can see which buyers clicked their CTA (WhatsApp/Call/Link).
7. **Seller Profile** — Edit business info, view account details.

---

## 5. API Keys & Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` → `backend/.env` and fill in the values from your team lead.

```env
# TiDB Cloud Database (shared by ALL team members — same connection string)
DATABASE_URL=mysql+pymysql://QFFKPCASzb8DNuc.root:<PASSWORD>@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/reachlo_db?ssl_verify_cert=false&ssl_verify_identity=false

# JWT Auth
JWT_SECRET=reachlo_secret_key_change_me_in_prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Google Maps Platform (for location autocomplete & reverse geocoding)
GOOGLE_PLACES_API_KEY=<get from team lead>
GOOGLE_MAPS_API_KEY=<get from team lead>

# AI Text Generation (Google Gemini)
GEMINI_API_KEY=<get from team lead>

# AI Image Generation (Ideogram — currently expired, app falls back to Pollinations for free)
IDEOGRAM_API_KEY=<get from team lead>

# Unused — can be left blank
HUGGINGFACE_API_KEY=
```

### Frontend (`REACHLO/.env`)

Copy `REACHLO/.env.example` → `REACHLO/.env` and set YOUR machine's IP.

```env
# Each team member sets their OWN computer's local Wi-Fi IP address here.
# To find your IP: run `ipconfig` in terminal → look for IPv4 Address under Wi-Fi.
EXPO_PUBLIC_API_URL=http://192.168.1.XX:8000/api
```

---

## 6. Local Development Setup

### Prerequisites

Install these on your machine:
- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Expo Go](https://expo.dev/go) app on your Android or iOS phone

### Step-by-Step

**Step 1 — Clone the repository**
```bash
git clone https://github.com/Mohanapriyavelmurugan/REACHLO.git
cd REACHLO
```

**Step 2 — Set up Python backend**
```powershell
# Create virtual environment inside the REACHLO root
python -m venv .venv

# Activate it (Windows PowerShell)
& .\.venv\Scripts\Activate.ps1

# Install all Python dependencies
pip install -r backend/requirements.txt
```

**Step 3 — Configure backend environment**
```powershell
# Copy the example file and rename it
copy backend\.env.example backend\.env
# Now open backend\.env and fill in the API keys (get them from your team lead)
```

**Step 4 — Run the backend server**
```powershell
cd backend
python -m app.main
```
✅ You should see: `INFO: Application startup complete.`

**Step 5 — Set up React Native frontend**
```powershell
cd ..\REACHLO
npm install
```

**Step 6 — Configure frontend environment**
```powershell
# Find your Wi-Fi IP address
ipconfig
# Look for: Wireless LAN adapter Wi-Fi -> IPv4 Address (e.g. 192.168.1.45)

# Create your .env file
copy .env.example .env

# Open REACHLO\.env and update the IP to YOUR machine's IP:
# EXPO_PUBLIC_API_URL=http://192.168.1.45:8000/api
```

**Step 7 — Run the Expo dev server**
```powershell
npx expo start --clear
```

**Step 8 — Open the app**
- Scan the QR code with the **Expo Go** app on your phone, OR
- Press `a` to open on a connected Android Emulator.

> ⚠️ Your phone and your computer **must be on the same Wi-Fi network** for local development to work.

---

## 7. Folder Structure

```
REACHLO/                            ← Root workspace
├── backend/                        ← Python FastAPI backend
│   ├── app/
│   │   ├── main.py                 ← App entry point, CORS, router registration
│   │   ├── config.py               ← Loads environment variables
│   │   ├── database.py             ← SQLAlchemy engine + session
│   │   ├── models.py               ← Database table definitions (source of truth)
│   │   ├── schemas.py              ← Pydantic request/response models
│   │   ├── security.py             ← Password hashing, JWT creation
│   │   ├── dependencies.py         ← Auth middleware (get_current_user)
│   │   ├── migrations.py           ← Lightweight schema migration runner
│   │   ├── routers/
│   │   │   ├── auth.py             ← /api/auth (login, register, profile)
│   │   │   ├── campaigns.py        ← /api/campaigns (CRUD, feed, nearby)
│   │   │   ├── ai.py               ← /api/ai (generation, drafts)
│   │   │   ├── businesses.py       ← /api/businesses
│   │   │   ├── leads.py            ← /api/leads
│   │   │   └── upload.py           ← /api/upload (image upload)
│   │   └── utils/
│   │       ├── ai_generation.py    ← Core AI logic (Gemini + Ideogram/Pollinations)
│   │       └── location.py         ← Google Maps / Places API wrappers
│   ├── uploads/                    ← Local AI-generated and uploaded images
│   ├── .env                        ← Your secrets (NOT committed to Git)
│   └── .env.example                ← Template for teammates ✅ (in Git)
│
└── REACHLO/                        ← React Native (Expo) frontend
    ├── src/
    │   ├── screens/                ← Auth screens (Login, Register, Splash, etc.)
    │   │   └── placeholders/       ← Main screens (Dashboard, Feed, Detail, etc.)
    │   ├── components/             ← Reusable UI components
    │   ├── services/               ← API call functions (authService, apiService)
    │   ├── config/
    │   │   └── apiConfig.js        ← Builds API base URL from environment
    │   ├── context/                ← React context (Auth state management)
    │   └── navigation/             ← Stack & Tab navigators
    ├── .env                        ← Your local IP (NOT committed to Git)
    └── .env.example                ← Template for teammates ✅ (in Git)
```

---

## 8. API Endpoints Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register new user (Buyer or Seller) |
| `POST` | `/api/auth/login` | No | Login, returns JWT token |
| `GET` | `/api/auth/me` | Yes | Get current user profile |
| `PUT` | `/api/auth/me` | Yes | Update user profile |
| `GET` | `/api/campaigns` | Optional | List campaigns (`?city=`, `?category=`, `?seller_mode=true`) |
| `POST` | `/api/campaigns` | Seller | Create a new campaign |
| `PUT` | `/api/campaigns/{id}` | Seller | Update a campaign |
| `DELETE` | `/api/campaigns/{id}` | Seller | Soft-delete a campaign |
| `GET` | `/api/campaigns/nearby` | No | Campaigns near GPS coords (`?latitude=&longitude=`) |
| `POST` | `/api/campaigns/{id}/view` | Optional | Track a campaign view |
| `GET` | `/api/businesses/me` | Yes | Get the logged-in seller's business profile |
| `PUT` | `/api/businesses/me` | Yes | Update business profile |
| `GET` | `/api/leads` | Seller | Get all leads for the seller's campaigns |
| `POST` | `/api/leads` | Buyer | Record a buyer contact event (tap CTA) |
| `POST` | `/api/ai/generate` | Seller | Generate AI campaign text + thumbnail image |
| `GET` | `/api/ai/drafts/{draft_id}` | Yes | Get an AI draft by ID |
| `POST` | `/api/upload` | Yes | Upload a campaign image file |
| `GET` | `/api/campaigns/places/autocomplete` | No | Google Places autocomplete proxy |

---

## 9. Known Issues & Tips

| Issue | Fix |
|---|---|
| `Network request failed` on Expo Go | Make sure phone and laptop are on the same Wi-Fi. Check `EXPO_PUBLIC_API_URL` in `REACHLO/.env` has your correct IP. Run `ipconfig` to find it. |
| Backend ignores new `.env` changes | Stop (`Ctrl+C`) and restart `python -m app.main`. The `.env` is only read on startup. |
| Old IP still showing after changing `app.json` | Always run `npx expo start --clear` after changing `app.json`. |
| Ideogram image fails with `401` | Ideogram API key is expired. App automatically falls back to Pollinations AI for free. Get a new key from [ideogram.ai](https://ideogram.ai) if premium images are needed. |
| `PORT 8081 already in use` | Kill all existing Expo terminals first. Or allow Expo to use port 8082. |
| Campaigns not showing in buyer feed | Check the backend is running. Verify the campaign `status` is `ACTIVE` and its `end_date` has not passed. |
| New registrations not appearing in TiDB | Make sure `backend/.env` has the TiDB `DATABASE_URL`, not the local `127.0.0.1` MySQL URL. Restart backend after any `.env` change. |
