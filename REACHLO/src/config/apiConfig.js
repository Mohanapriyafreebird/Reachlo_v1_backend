import Constants from 'expo-constants';

// ======================================================
// API & NETWORK CONFIGURATION
// ======================================================
// Configure environment variables via .env using EXPO_PUBLIC_* prefix:
// - EXPO_PUBLIC_API_URL: e.g. http://192.168.1.12:8000/api
// - EXPO_PUBLIC_WS_URL: e.g. ws://192.168.1.12:8000/api
// - EXPO_PUBLIC_MEDIA_BASE_URL: e.g. http://192.168.1.12:8000
// ======================================================

const FULL_URL_OVERRIDE = null; // or Constants.expoConfig?.extra?.apiUrl

const extractHost = (url) => {
  if (!url) return null;
  const match = url.match(/\/\/([^:/]+)(?::\d+)?\//);
  return match?.[1] ?? null;
};

const getDevHost = () => {
  const expoHost =
    extractHost(Constants.expoConfig?.hostUri) ||
    extractHost(Constants.manifest2?.extra?.expoGo?.debuggerHost) ||
    extractHost(Constants.manifest?.debuggerHost);

  return expoHost || '127.0.0.1';
};

// Fallback production backend URLs (used when EXPO_PUBLIC_* environment variables are not set)
const LIVE_BASE_URL = 'https://Reachlo-v1-backend.onrender.com/api';
const LIVE_MEDIA_BASE_URL = 'https://Reachlo-v1-backend.onrender.com';
const LIVE_WS_BASE_URL = 'wss://Reachlo-v1-backend.onrender.com/api';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (FULL_URL_OVERRIDE ? `${FULL_URL_OVERRIDE}/api` : LIVE_BASE_URL);

let MEDIA_BASE_URL =
  process.env.EXPO_PUBLIC_MEDIA_BASE_URL ||
  (process.env.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, '')
    : (FULL_URL_OVERRIDE ? FULL_URL_OVERRIDE : LIVE_MEDIA_BASE_URL));

const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL ||
  BASE_URL.replace(/^http/, 'ws');

if (__DEV__) {
  console.log('[REACHLO] API base URL:', BASE_URL);
  console.log('[REACHLO] WS base URL:', WS_BASE_URL);
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
