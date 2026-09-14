// Lightweight WebSocket client for real-time server push notifications.
// Falls back silently to the existing 30s polling when WS is unavailable
// (offline, proxy not configured, or connection refused).

import { useAuthStore } from '../store/authStore';

type Handler = (data: any) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private reconnectTimer: any = null;
  private enabled = false;
  private reconnectAttempts = 0;

  connect() {
    const user = useAuthStore.getState().user;
    if (!user || this.enabled) return;
    this.enabled = true;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    try {
      this.ws = new WebSocket(`${proto}//${host}/ws`);
    } catch (e) {
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const set = this.handlers.get(msg.type);
        if (set) set.forEach((h) => h(msg));
      } catch (e) {}
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.enabled = false;
      // Reconnect with backoff (skip if auth gone)
      if (useAuthStore.getState().user) {
        const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
      }
    };

    this.ws.onerror = () => {
      if (this.ws) this.ws.close();
    };
  }

  disconnect() {
    this.enabled = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
    this.ws = null;
  }

  on(type: string, handler: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  off(type: string, handler: Handler) {
    this.handlers.get(type)?.delete(handler);
  }
}

export const wsClient = new WSClient();
