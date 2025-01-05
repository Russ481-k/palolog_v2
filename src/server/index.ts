import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { createServer } from 'http';

import { env } from '@/env.mjs';

import { createContext } from './context';
import { appRouter } from './routers/_app';
import createWebSocketServer from './ws/downloadProgress';

console.log('[Server] Starting WebSocket server initialization...');
console.log('NEXT_PUBLIC_ENV_NAME : ', env.NEXT_PUBLIC_ENV_NAME);

const WS_PORT = env.NEXT_PUBLIC_ENV_NAME !== 'LOCAL' ? 8001 : 3001;
console.log('WS_PORT : ', WS_PORT);
console.log(`[Server] Configured to use port ${WS_PORT} for WebSocket`);

const wsServer = createServer();
console.log('[Server] WebSocket HTTP server instance created');

// Create WebSocket server
console.log('[Server] Creating WebSocket server...');
const wss = createWebSocketServer({ server: wsServer });
console.log('[Server] WebSocket server created');

console.log(`[Server] Starting WebSocket server on port ${WS_PORT}...`);
wsServer.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`[Server] WebSocket server is running on port ${WS_PORT}`);
  console.log(
    `[Server] WebSocket endpoint available at ws://0.0.0.0:${WS_PORT}/api/ws/download`
  );
});
