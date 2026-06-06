import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from '../services/token-blacklist.service';

/**
 * Interceptor para:
 * 1. Verificar que tokens no estén en blacklist
 * 2. Renovación automática de JWT con sliding window
 *
 * Cuando un token está próximo a expirar (< 24 horas), automáticamente
 * se emite un nuevo token en el header 'X-New-Token' para que el cliente
 * lo pueda captar y utilizar en futuras peticiones.
 */
@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TokenRefreshInterceptor.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // ============================================================
    // 1. VERIFICAR BLACKLIST DE TOKENS
    // ============================================================
    const token = this.extractTokenFromHeader(request);
    if (token && request.user) {
      // Solo verificamos si hay usuario autenticado (después del JWT guard)
      try {
        const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
        if (isBlacklisted) {
          throw new UnauthorizedException(
            'Token ha sido revocado. Por favor, inicia sesión nuevamente.',
          );
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        this.logger.error(`Error checking token blacklist: ${error.message}`);
      }
    }

    // ============================================================
    // 2. SLIDING WINDOW EXPIRATION - Renovar token próximo a expirar
    // ============================================================
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const user = request.user;

        // Si el usuario está autenticado y el campo indica renovación
        if (user && user.shouldIssueNewToken) {
          try {
            // Generar nuevo token
            const newToken = this.jwtService.sign({
              sub: user.userId,
              role: user.userType,
              isTemporaryPassword: user.isTemporaryPassword,
            });

            // Enviar el nuevo token en header para que el cliente lo capture
            response.setHeader('X-New-Token', newToken);
            response.setHeader('X-Token-Renewed', 'true');

            this.logger.debug(
              `Token renovado para usuario ${user.userId} (sliding window)`,
            );
          } catch (error) {
            this.logger.error(`Error renewing token: ${error.message}`);
            // Si hay error, solo continuamos sin renovar
            // El token actual sigue siendo válido
          }
        }

        return data;
      }),
    );
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
