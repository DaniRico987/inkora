import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly tokenExpiresIn: string;

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });

    this.tokenExpiresIn =
      configService.get<string>('JWT_EXPIRES_IN') ?? '15m';
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { userId: payload.sub },
      select: {
        userId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        userType: true,
        status: true,
        client: {
          select: {
            clientId: true,
          },
        },
        admin: {
          select: {
            isTemporaryPassword: true,
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const { admin, ...safeUser } = user;
    const authenticatedUser: AuthenticatedUser = {
      ...safeUser,
      clientId: safeUser.client?.clientId,
      isTemporaryPassword: admin?.isTemporaryPassword ?? false,
    };

    // ============================================================
    // SLIDING WINDOW EXPIRATION
    // Si el token expira en menos de 2 minutos, marcar para renovación
    // ============================================================
    const now = Date.now() / 1000; // Timestamp actual en segundos
    const expiresIn = payload.exp - now; // Segundos hasta expiración
    const REFRESH_THRESHOLD_SECONDS = 2 * 60; // 2 minutos en segundos

    if (expiresIn < REFRESH_THRESHOLD_SECONDS && expiresIn > 0) {
      // Token se renovará automáticamente en la respuesta
      authenticatedUser['shouldIssueNewToken'] = true;
      authenticatedUser['tokenExpiresIn'] = this.tokenExpiresIn;
    }

    return authenticatedUser;
  }
}
