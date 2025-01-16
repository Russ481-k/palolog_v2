import { Socket } from 'socket.io-client';

import { WebSocketMessage } from '../../../types';
import { ConnectionState } from './constants';

type MenuType = 'TRAFFIC' | 'THREAT' | 'SYSTEM';

export interface WebSocketConnectionConfig {
  downloadId: string;
  searchId: string;
  searchParams: {
    menu: MenuType;
    timeFrom: string;
    timeTo: string;
    searchTerm: string;
  };
  totalRows: number;
  onMessage: (message: WebSocketMessage) => void;
  onError: (error: Error) => void;
  onConnectionAcknowledged: () => void;
}

export interface SocketEventHandlers {
  handleConnect: (socket: Socket) => void;
  handleConnected: (socket: Socket, resolve: (socket: Socket) => void) => void;
  handleDisconnect: (socket: Socket, reason: string) => void;
  handleError: (error: unknown) => void;
  handleProgress: (message: WebSocketMessage) => void;
  handleConnectError: (
    socket: Socket,
    error: Error,
    reject: (error: Error) => void
  ) => void;
}

export interface WebSocketState {
  connectionState: ConnectionState;
  socket: Socket | null;
  downloadId: string | null;
  reconnectionAttempts: number;
  lastMessageTimestamp: number;
  heartbeatInterval?: NodeJS.Timeout;
  heartbeatTimeout?: NodeJS.Timeout;
  connectionTimeout?: number;
}
