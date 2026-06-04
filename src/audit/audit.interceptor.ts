import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AUDIT_ACTION_KEY } from './audit.decorator';
import { AuditService } from './audit.service';

type HttpRequestWithUser = {
  method?: string;
  originalUrl?: string;
  baseUrl?: string;
  route?: { path?: string };
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  user?: AuthenticatedUser;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const action = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<HttpRequestWithUser>();

    return next.handle().pipe(
      tap((responseBody) => {
        const userId = request.user?.userId;
        if (!userId) {
          return;
        }

        const affectedEntity = this.resolveEntity(request);
        const affectedEntityId = this.resolveEntityId(request, responseBody);

        const detail = JSON.stringify({
          method: request.method,
          path: request.originalUrl,
          routePath: request.route?.path,
          params: request.params,
          query: request.query,
        });

        void this.auditService.logOperation({
          userId,
          action,
          affectedEntity,
          affectedEntityId,
          detail,
        });
      }),
    );
  }

  private resolveEntity(request: HttpRequestWithUser): string | null {
    const source = request.baseUrl ?? request.originalUrl ?? '';
    if (!source) {
      return null;
    }

    const normalized = source.split('?')[0].split('/').filter(Boolean);
    if (normalized.length === 0) {
      return null;
    }

    const last = normalized[normalized.length - 1];
    if (/^v\d+$/i.test(last) && normalized.length > 1) {
      return normalized[normalized.length - 2] ?? null;
    }

    return last;
  }

  private resolveEntityId(
    request: HttpRequestWithUser,
    responseBody: unknown,
  ): number | null {
    const candidates: unknown[] = [
      request.params?.id,
      request.params?.userId,
      request.params?.purchaseId,
      request.params?.reservationId,
      request.params?.returnBookId,
      this.tryGet(responseBody, 'id'),
      this.tryGet(responseBody, 'userId'),
      this.tryGet(responseBody, 'purchaseId'),
      this.tryGet(responseBody, 'reservationId'),
      this.tryGet(responseBody, 'returnBookId'),
      this.tryGet(responseBody, 'logId'),
    ];

    for (const value of candidates) {
      const parsed = Number(value);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  }

  private tryGet(data: unknown, key: string): unknown {
    if (!data || typeof data !== 'object') {
      return undefined;
    }

    return (data as Record<string, unknown>)[key];
  }
}
