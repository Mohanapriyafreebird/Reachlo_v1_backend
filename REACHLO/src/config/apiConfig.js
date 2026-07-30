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

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || (FULL_URL_OVERRIDE ? `${FULL_URL_OVERRIDE}/api` : `http://${DEV_HOST}:${PORT}/api`);

let MEDIA_BASE_URL = FULL_URL_OVERRIDE ? FULL_URL_OVERRIDE : `http://${DEV_HOST}:${PORT}`;
if (process.env.EXPO_PUBLIC_API_URL) {
  MEDIA_BASE_URL = process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, '');
}

const WS_BASE_URL = BASE_URL.replace(/^http/, 'ws');


if (__DEV__) {
  console.log('[REACHLO] API base URL:', BASE_URL);
}

// NOTE: If using a PHYSICAL device with Expo Go, replace DEV_HOST 
// below with your computer's local Wi-Fi IP address (e.g. '192.168.1.100')
const LIVE_BASE_URL = 'https://reachlo-backend.onrender.com/api';
const LIVE_MEDIA_BASE_URL = 'https://reachlo-backend.onrender.com';
const LIVE_WS_BASE_URL = 'wss://reachlo-backend.onrender.com/api';

export const API_CONFIG = {
  BASE_URL: BASE_URL,
  MEDIA_BASE_URL: MEDIA_BASE_URL,
  WS_BASE_URL: WS_BASE_URL,
  TIMEOUT: 60000,
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
