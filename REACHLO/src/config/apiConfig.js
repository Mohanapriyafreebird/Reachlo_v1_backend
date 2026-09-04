import Constants from 'expo-constants';

// ======================================================
// HOW TO CONFIGURE THIS FILE:
// ======================================================
// 1. PHYSICAL DEVICE (Expo Go) — your phone and laptop must be on the same WiFi.
// 2. ANDROID EMULATOR — the correct local host mapping is 10.0.2.2.
// 3. iOS Simulator — localhost / 127.0.0.1 works.
// 4. Production — update BASE_URL to your deployed API URL.
// ======================================================

// When running on a physical device or if Expo host info cannot be resolved,
// use the platform-appropriate local dev host.
const PORT = '8000';

const FULL_URL_OVERRIDE = null; // or Constants.expoConfig?.extra?.apiUrl

const HOST_OVERRIDE = null; // Hardcoded for local testing, originally Constants.expoConfig?.extra?.apiHost

const extractHost = (url) => {
  if (!url) return null;
  const match = url.match(/\/\/([^:/]+)(?::\d+)?\//);
  return match?.[1] ?? null;
};

const getDevHost = () => {
  if (HOST_OVERRIDE) {
    return HOST_OVERRIDE;
  }

  const expoHost =
    extractHost(Constants.expoConfig?.hostUri) ||
    extractHost(Constants.manifest2?.extra?.expoGo?.debuggerHost) ||
    extractHost(Constants.manifest?.debuggerHost);

  return expoHost || '127.0.0.1';
};

const DEV_HOST = getDevHost();

// Production backend URL — used as fallback when EXPO_PUBLIC_API_URL is not set
// (EAS builds do NOT read the local .env file unless env vars are set in eas.json or EAS dashboard)
const LIVE_BASE_URL = 'https://Reachlo-v1-backend.onrender.com/api';
const LIVE_MEDIA_BASE_URL = 'https://Reachlo-v1-backend.onrender.com';
const LIVE_WS_BASE_URL = 'wss://Reachlo-v1-backend.onrender.com/api';

// In EAS builds EXPO_PUBLIC_API_URL is undefined unless configured on the EAS dashboard.
// Fall back to the live Render URL to prevent the APK from hitting localhost (127.0.0.1).
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || (FULL_URL_OVERRIDE ? `${FULL_URL_OVERRIDE}/api` : LIVE_BASE_URL);

let MEDIA_BASE_URL = FULL_URL_OVERRIDE ? FULL_URL_OVERRIDE : LIVE_MEDIA_BASE_URL;
if (process.env.EXPO_PUBLIC_API_URL) {
  MEDIA_BASE_URL = process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, '');
}

const WS_BASE_URL = BASE_URL.replace(/^http/, 'ws');


if (__DEV__) {
  console.log('[REACHLO] API base URL:', BASE_URL);
}

export const API_CONFIG = {
  BASE_URL: BASE_URL,
  MEDIA_BASE_URL: MEDIA_BASE_URL,
  WS_BASE_URL: WS_BASE_URL,
  TIMEOUT: 180000,
};

/** Resolve relative upload paths (e.g. /uploads/abc.jpg) to a full URL for Image components. */
export const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('file:') || url.startsWith('content:')) {
    return url;
  }
  return `${API_CONFIG.MEDIA_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

export default API_CONFIG;
