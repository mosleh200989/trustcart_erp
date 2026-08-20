import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limit key for requests arriving through nginx.
 *
 * The app sits behind nginx, so the socket address is always 127.0.0.1 and
 * would make every visitor look like one client. nginx sets `X-Real-IP` from
 * `$remote_addr` and *overwrites* any value the client supplied, so it is the
 * one header here that a caller cannot forge.
 *
 * `X-Forwarded-For` is deliberately not used: nginx appends to whatever the
 * client sent, so its left-hand entries are attacker-controlled and would let
 * anyone rotate their own rate-limit bucket at will.
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const realIp = req?.headers?.['x-real-ip'];
    const candidate = Array.isArray(realIp) ? realIp[0] : realIp;

    const ip = String(candidate || req?.ip || req?.socket?.remoteAddress || '')
      .trim()
      .replace(/^::ffff:/, '');

    // An empty tracker would put every such request in one shared bucket.
    return ip || 'unknown';
  }
}
