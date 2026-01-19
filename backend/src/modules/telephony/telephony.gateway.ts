import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

@WebSocketGateway({
  namespace: '/telephony',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TelephonyGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TelephonyGateway.name);

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as any)?.token ||
        (client.handshake.query as any)?.token ||
        (client.handshake.headers?.authorization
          ? String(client.handshake.headers.authorization).replace(/^Bearer\s+/i, '')
          : undefined);

      if (!token) {
        this.logger.warn('Socket connection rejected: missing token');
        client.disconnect(true);
        return;
      }

      jwt.verify(token, process.env.JWT_SECRET || 'trustcart-erp-secret-key-2024');
      this.logger.log(`Socket connected: ${client.id}`);
    } catch (err) {
      this.logger.warn(`Socket connection rejected: invalid token (${(err as any)?.message || 'unknown'})`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  emitIncomingCall(payload: any) {
    this.server.emit('incoming_call', payload);
  }

  emitCallUpdated(payload: any) {
    this.server.emit('call_updated', payload);
  }

  emitAgentPresence(payload: any) {
    this.server.emit('agent_presence', payload);
  }
}
