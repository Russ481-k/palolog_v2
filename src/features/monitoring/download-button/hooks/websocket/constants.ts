export const MAX_RECONNECTION_ATTEMPTS = 3;
export const RECONNECTION_DELAY = 1000;
export const CONNECTION_TIMEOUT = 10000;
export const HEARTBEAT_INTERVAL = 30000; // 30초
export const HEARTBEAT_TIMEOUT = 5000; // 5초

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ACKNOWLEDGED = 'acknowledged',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
}
