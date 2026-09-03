import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DATA_ACCESS_KEY, DataAccessMetadata } from '../../common/decorators/data-access.decorator';
import { DataAccessService } from './data-access.service';
import { countRecords, summariseFilters } from './count-records';

/**
 * Writes one row per read on any handler carrying @LogDataAccess.
 *
 * Registered globally but inert everywhere else: without the decorator this
 * does nothing, so ordinary traffic is unaffected and adding a new sensitive
 * endpoint to the log is a one-line change on that handler.
 *
 * The write is fire-and-forget — the response has already been produced, and a
 * logging failure must never turn a successful read into an error.
 */
@Injectable()
export class DataAccessInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly service: DataAccessService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.getAllAndOverride<DataAccessMetadata>(DATA_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap({
        next: (payload) => {
          const user = request?.user;
          const forwarded = request?.headers?.['x-forwarded-for'] || request?.headers?.['x-real-ip'] || '';
          const ip = typeof forwarded === 'string' && forwarded
            ? forwarded.split(',')[0].trim()
            : String(request?.ip || '').replace(/^::ffff:/, '');

          void this.service.record({
            userId: Number(user?.id) || null,
            userName: [user?.username, user?.email].filter(Boolean).join(' · ') || null,
            resource: metadata.resource,
            action: metadata.action,
            recordCount: countRecords(payload),
            recordId: metadata.idParam ? request?.params?.[metadata.idParam] : null,
            filters: summariseFilters(request?.query),
            endpoint: request?.originalUrl || request?.url || null,
            ipAddress: ip || null,
            userAgent: request?.headers?.['user-agent'] || null,
          });
        },
      }),
    );
  }
}
