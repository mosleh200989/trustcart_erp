import { io, type Socket } from 'socket.io-client';
import { BACKEND_ORIGIN } from '@/config/backend';

export type IncomingCallPayload = {
  call: any;
  customer: null | { id: number; name?: string; phone?: string; email?: string };
};

let socket: Socket | null = null;

export function getTelephonySocket(): Socket {
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
}

export function disconnectTelephonySocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
