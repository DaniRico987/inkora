import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';
import * as crypto from 'crypto';

export type TokenRevocationReason = 'user_logout' | 'password_change' | 'security';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Genera hash SHA256 del token para búsqueda eficiente
   * No almacena el token completo por razones de seguridad
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Decodifica JWT sin verificar firma
   * (Seguro porque solo se usa para obtener el campo 'exp')
   */
  private decodeJwt(token: string): any {
    try {
      const [, payload] = token.split('.');
      if (!payload) {
        throw new Error('Token format invalid');
      }
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch (error) {
      this.logger.error(`Error decoding JWT: ${error.message}`);
      throw new Error('Token inválido');
    }
  }

  /**
   * Revoca un token (logout single)
   * @param token JWT completo
   * @param userId ID del usuario
   * @param reason Razón de revocación
   */
  async revokeToken(
    token: string,
    userId: number,
    reason: TokenRevocationReason = 'user_logout',
  ): Promise<void> {
    try {
      const tokenHash = this.hashToken(token);

      // Decodificar JWT para obtener expiración
      const decoded = this.decodeJwt(token);
      const expiresAt = new Date(decoded.exp * 1000);

      // Insertar en blacklist
      await this.prisma.tokenBlacklist.create({
        data: {
          tokenHash,
          userId,
          reason,
          expiresAt,
        },
      });

      this.logger.debug(
        `Token revocado para usuario ${userId} - Razón: ${reason}`,
      );
    } catch (error) {
      this.logger.error(`Error revoking token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica si un token está en blacklist
   * Guard lo usará en cada request para validar que el token no ha sido revocado
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);

      const blacklisted = await this.prisma.tokenBlacklist.findUnique({
        where: { tokenHash },
      });

      return !!blacklisted;
    } catch (error) {
      this.logger.error(`Error checking token blacklist: ${error.message}`);
      // En caso de error, es más seguro asumir que el token está revocado
      return true;
    }
  }

  /**
   * Limpia tokens expirados de la BD (limpieza automática)
   * Ejecutar con cron job cada hora o bajo demanda
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.tokenBlacklist.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`🗑️ Limpiados ${result.count} tokens expirados`);
      }

      return result.count;
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired tokens: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Revoca todos los tokens activos de un usuario (excepto el actual)
   * Útil para: logout-all, cambio de contraseña, revocación de cuenta
   *
   * NOTA: Esta es una versión simplificada.
   * Para una verdadera revocación de "todas las sesiones",
   * necesitaríamos mantener una tabla de "active_sessions" o usar un "sessionVersion"
   */
  async revokeAllUserTokensExcept(
    userId: number,
    currentToken?: string,
    reason: TokenRevocationReason = 'user_logout',
  ): Promise<number> {
    try {
      // Por ahora, solo revocamos el token actual si se proporciona
      // Una implementación completa requeriría una tabla de sesiones activas
      if (currentToken) {
        await this.revokeToken(currentToken, userId, reason);
        return 1;
      }

      this.logger.warn(
        `Logout-all sin token actual para usuario ${userId} - implementación incompleta`,
      );
      return 0;
    } catch (error) {
      this.logger.error(
        `Error revoking all user tokens: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de tokens revocados (para auditoría)
   */
  async getBlacklistStats(): Promise<{
    totalRevoked: number;
    byReason: Record<string, number>;
  }> {
    try {
      const total = await this.prisma.tokenBlacklist.count();

      const stats = await this.prisma.tokenBlacklist.groupBy({
        by: ['reason'],
        _count: true,
      });

      const byReason: Record<string, number> = {};
      stats.forEach((stat) => {
        byReason[stat.reason] = stat._count;
      });

      return {
        totalRevoked: total,
        byReason,
      };
    } catch (error) {
      this.logger.error(`Error getting blacklist stats: ${error.message}`);
      return { totalRevoked: 0, byReason: {} };
    }
  }
}
