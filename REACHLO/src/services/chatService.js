import apiService from './apiService';
import API_CONFIG from '../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_RETENTION_KEY = 'reachlo_chat_retention';
const CHAT_CACHE_KEY_PREFIX = 'reachlo_chat_';

// ---------------------------------------------------------------------------
// Keep-alive: ping the backend every 10 minutes so Render's free-tier server
// does NOT spin down (which causes the infamous 50-second cold-start delay).
// ---------------------------------------------------------------------------
let _keepAliveTimer = null;

function _startKeepAlive() {
  if (_keepAliveTimer) return; // already running
  _keepAliveTimer = setInterval(async () => {
    try {
      await fetch(`${API_CONFIG.MEDIA_BASE_URL}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch (_) {
      // Ignore — this is best-effort only
    }
  }, 10 * 60 * 1000); // every 10 minutes
}

class ChatService {
  constructor() {
    this.ws = null;
    this.listeners = [];
    this.localListeners = [];
    this.isConnected = false;
    this.reconnectTimeout = null;
    // Start keep-alive as soon as service is instantiated
    _startKeepAlive();
    this.connectWs();
  }

  async getRetentionPolicy() {
    try {
      const val = await AsyncStorage.getItem(CHAT_RETENTION_KEY);
      return val || 'forever'; // 24h, 1w, 1m, forever
    } catch (e) {
      return 'forever';
    }
  }

  async setRetentionPolicy(policy) {
    await AsyncStorage.setItem(CHAT_RETENTION_KEY, policy);
  }

  async getPinnedThreads() {
    try {
      const val = await AsyncStorage.getItem('reachlo_pinned_threads');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  async togglePin(threadId) {
    const pinned = await this.getPinnedThreads();
    let newPinned = [];
    if (pinned.includes(threadId)) {
      newPinned = pinned.filter(id => id !== threadId);
    } else {
      newPinned = [...pinned, threadId];
    }
    await AsyncStorage.setItem('reachlo_pinned_threads', JSON.stringify(newPinned));
    return newPinned.includes(threadId);
  }

  async _getStoredMessages(threadId) {
    try {
      const data = await AsyncStorage.getItem(`${CHAT_CACHE_KEY_PREFIX}${threadId}`);
      if (!data) return [];
      const parsed = JSON.parse(data);

      const policy = await this.getRetentionPolicy();
      if (policy === 'forever') return parsed;

      const now = new Date().getTime();
      let limitMs = 0;
      if (policy === '24h') limitMs = 24 * 60 * 60 * 1000;
      else if (policy === '1w') limitMs = 7 * 24 * 60 * 60 * 1000;
      else if (policy === '1m') limitMs = 30 * 24 * 60 * 60 * 1000;

      return parsed.filter(m => (now - new Date(m.created_at).getTime()) < limitMs);
    } catch (e) {
      return [];
    }
  }

  async _storeMessages(threadId, messages) {
    try {
      await AsyncStorage.setItem(`${CHAT_CACHE_KEY_PREFIX}${threadId}`, JSON.stringify(messages));
    } catch (e) {
      console.log('Error caching messages', e);
    }
  }

  async connectWs() {
    if (this.ws || this.isConnected) return;

    try {
      const token = await AsyncStorage.getItem('reachlo_token');
      if (!token) return;

      const wsUrl = `${API_CONFIG.WS_BASE_URL}/chat/ws?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[ChatService] WS Connected');
        this.isConnected = true;
      };

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this.listeners.forEach(listener => listener(data));
        } catch (error) {
          console.error('[ChatService] Error parsing WS message', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[ChatService] WS Disconnected');
        this.isConnected = false;
        this.ws = null;
        // Auto-reconnect after 3s
        this.reconnectTimeout = setTimeout(() => this.connectWs(), 3000);
      };

      this.ws.onerror = (e) => {
        console.error('[ChatService] WS Error', e.message);
        this.ws?.close();
      };
    } catch (e) {
      console.error('[ChatService] Connect error', e);
    }
  }

  disconnectWs() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  subscribeLocal(callback) {
    this.localListeners.push(callback);
    return () => {
      this.localListeners = this.localListeners.filter(l => l !== callback);
    };
  }

  emitLocal(event, data) {
    this.localListeners.forEach(listener => listener({ event, ...data }));
  }

  sendWsMessage(message) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Create a thread for a newly claimed deal.
   */
  async createThread(leadId) {
    return apiService.post('/chat/threads', { lead_id: leadId });
  }

  /**
   * List all threads for the logged-in user.
   */
  async getThreads() {
    return apiService.get('/chat/threads');
  }

  /**
   * Get messages for a thread.
   *
   * PERFORMANCE: Returns cached messages IMMEDIATELY via onCacheHit callback
   * so the UI renders instantly, then fetches fresh data from the server
   * in parallel and returns it. This eliminates the perceived loading delay.
   */
  async getMessages(threadId, onCacheHit) {
    // 1. Return cached messages immediately so UI shows something at once
    const cached = await this._getStoredMessages(threadId);
    if (cached.length > 0 && typeof onCacheHit === 'function') {
      onCacheHit(cached);
    }

    // 2. Fetch fresh data from server
    try {
      const serverMsgs = await apiService.get(`/chat/threads/${threadId}/messages`);
      await this._storeMessages(threadId, serverMsgs);

      const policy = await this.getRetentionPolicy();
      if (policy === 'forever') return serverMsgs;

      const now = new Date().getTime();
      let limitMs = 0;
      if (policy === '24h') limitMs = 24 * 60 * 60 * 1000;
      else if (policy === '1w') limitMs = 7 * 24 * 60 * 60 * 1000;
      else if (policy === '1m') limitMs = 30 * 24 * 60 * 60 * 1000;

      return serverMsgs.filter(m => (now - new Date(m.created_at).getTime()) < limitMs);
    } catch (e) {
      console.log('Failed to fetch messages, using cache');
      return cached; // fallback to cache on network error
    }
  }

  /**
   * Send a message.
   */
  async sendMessage(threadId, body) {
    const msg = await apiService.post(`/chat/threads/${threadId}/messages`, { body });
    // Also store it locally instantly to avoid waiting for reload
    const cached = await this._getStoredMessages(threadId);
    if (!cached.find(m => m.id === msg.id)) {
      cached.push(msg);
      await this._storeMessages(threadId, cached);
    }
    return msg;
  }

  /**
   * Mark a thread as read to reset unread counters.
   */
  async markAsRead(threadId) {
    this.emitLocal('THREAD_READ', { threadId });
    return apiService.post(`/chat/threads/${threadId}/read`);
  }

  /**
   * Get the total unread message count for badge display.
   */
  async getUnreadCount() {
    return apiService.get('/chat/unread-count');
  }

  /**
   * Update the user's Expo push token.
   */
  async updatePushToken(token) {
    return apiService.post('/auth/push-token', { expo_push_token: token });
  }
}

export const chatService = new ChatService();
export default chatService;
