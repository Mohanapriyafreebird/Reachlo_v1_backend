# REACHLO

A hyperlocal advertising platform connecting local businesses (Sellers) with potential buyers through AI-generated ad campaigns.

---

## Environment Setup

To configure the frontend application, create a `.env` file inside the `REACHLO` directory:

```bash
cd REACHLO
cp .env.example .env
```

### Environment Variables

Configure the following variables in `REACHLO/.env`:

```env
# Backend REST API base URL
# For local testing on a physical device via Expo Go, replace YOUR_LOCAL_IP with your machine's LAN IP (e.g., 192.168.1.12).
# For Android emulator, you can use 10.0.2.2. For iOS simulator, use localhost.
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000/api

# WebSocket base URL for real-time chat
EXPO_PUBLIC_WS_URL=ws://YOUR_LOCAL_IP:8000/api

# Optional: Media base URL for image uploads (defaults to EXPO_PUBLIC_API_URL without /api)
# EXPO_PUBLIC_MEDIA_BASE_URL=http://YOUR_LOCAL_IP:8000
```

> **Note:**
> - Do not commit `.env` files to Git. `.env` and local variants are listed in `.gitignore`.
> - Always refer to `.env.example` (or `REACHLO/.env.example`) as the canonical template.
> - After adding or modifying environment variables, restart the Expo development server with a clean cache (`npx expo start --clear`).

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Python](https://www.python.org/) (v3.11 recommended)
- [Expo Go](https://expo.dev/client) app installed on your physical mobile device (or Android Studio / Xcode for emulators/simulators)

---

### Running the Frontend (Expo)

1. Navigate to the `REACHLO` folder:
   ```bash
   cd REACHLO
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start --clear
   ```

4. Scan the QR code displayed in the terminal using the **Expo Go** app (Android) or Camera app (iOS) connected to the same Wi-Fi network.

---

### Running the Backend (FastAPI)

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Activate your virtual environment and install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the FastAPI server:
   ```bash
   python -m app.main
   ```
   or:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```