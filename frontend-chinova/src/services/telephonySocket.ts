import { io, type Socket } from 'socket.io-client';
import { BACKEND_ORIGIN } from '@/config/backend';

export type IncomingCallPayload = {
  call: any;
  customer: null | { id: number; name?: string; phone?: string; email?: string };
};

let socket: Socket | null = null;

// DISABLED: Socket connection causing "local network access" popup in Chrome
// Re-enable when telephony feature is needed
export function getTelephonySocket(): Socket {
  // Return a mock socket that does nothing
  if (!socket) {
    console.warn('Telephony socket is disabled. Real-time call features unavailable.');
  }
  return {
    on: () => {},
    off: () => {},
    emit: () => {},
    connect: () => {},
    disconnect: () => {},
    connected: false,
  } as unknown as Socket;
  
  /* ORIGINAL CODE - Uncomment to re-enable:
  if (socket) return socket;

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  socket = io(`${BACKEND_ORIGIN}/telephony`, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
  });

  return socket;
  */
}

export function disconnectTelephonySocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
