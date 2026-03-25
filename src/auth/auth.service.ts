import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { RecaptchaService } from '../recaptcha/recaptcha.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PrismaService } from 'prisma/prisma/prisma.service';

const BCRYPT_SALT_ROUNDS = 10;
const CAPTCHA_AFTER_FAILED_ATTEMPTS = 3;
const MAX_LOGIN_FAILED_ATTEMPTS = 5;
const DEFAULT_LOCK_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly recaptchaService: RecaptchaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(
    identifier: string,
    password: string,
    recaptchaToken: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      select: {
        userId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        userType: true,
        status: true,
        failedAttempts: true,
        blockedUntil: true,
        passwordHash: true,
        admin: {
          select: {
            isTemporaryPassword: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const now = new Date();

    if (user.status === 'blocked') {
      if (!user.blockedUntil) {
        const recoveredBlockedUntil = this.calculateBlockedUntil(now);
        await this.prisma.user.update({
          where: { userId: user.userId },
          data: { blockedUntil: recoveredBlockedUntil },
        });
        user.blockedUntil = recoveredBlockedUntil;
      }

      if (user.blockedUntil <= now) {
        await this.prisma.user.update({
          where: { userId: user.userId },
          data: {
            status: 'active',
            failedAttempts: 0,
            blockedUntil: null,
          },
        });
        user.status = 'active';
        user.failedAttempts = 0;
        user.blockedUntil = null;
      } else {
        const remainingBlockSeconds = this.calculateRemainingBlockSeconds(
          user.blockedUntil,
          now,
        );
        throw new UnauthorizedException({
          message: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos',
          accountBlocked: true,
          blockedUntil: user.blockedUntil,
          remainingBlockSeconds,
          requiresCaptcha: true,
          failedAttempts: user.failedAttempts,
          attemptsRemaining: 0,
        });
      }
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const requiresCaptcha =
      user.failedAttempts >= CAPTCHA_AFTER_FAILED_ATTEMPTS;
    if (requiresCaptcha) {
      const isHuman = await this.recaptchaService.verify(recaptchaToken);
      if (!isHuman) {
        const nextFailedAttempts = user.failedAttempts + 1;
        const shouldBlock = nextFailedAttempts >= MAX_LOGIN_FAILED_ATTEMPTS;
        const blockedUntil = shouldBlock
          ? this.calculateBlockedUntil(now)
          : null;

        await this.prisma.user.update({
          where: { userId: user.userId },
          data: {
            failedAttempts: nextFailedAttempts,
            status: shouldBlock ? 'blocked' : user.status,
            blockedUntil,
          },
        });

        if (shouldBlock) {
          try {
            await this.mailService.sendAccountBlockedNotification(
              user.email,
              user.firstName,
              blockedUntil ?? now,
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'unknown error';
            this.logger.warn(
              `No se pudo enviar correo de bloqueo a ${user.email}: ${message}`,
            );
          }

          throw new UnauthorizedException({
            message: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos',
            accountBlocked: true,
            blockedUntil,
            remainingBlockSeconds: this.calculateRemainingBlockSeconds(
              blockedUntil,
              now,
            ),
            requiresCaptcha: true,
            failedAttempts: nextFailedAttempts,
            attemptsRemaining: 0,
          });
        }

        throw new UnauthorizedException({
          message: 'ReCAPTCHA verification failed',
          requiresCaptcha: true,
          failedAttempts: nextFailedAttempts,
          attemptsRemaining: Math.max(
            0,
            MAX_LOGIN_FAILED_ATTEMPTS - nextFailedAttempts,
          ),
        });
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const nextFailedAttempts = user.failedAttempts + 1;
      const shouldBlock = nextFailedAttempts >= MAX_LOGIN_FAILED_ATTEMPTS;
      const blockedUntil = shouldBlock
        ? this.calculateBlockedUntil(now)
        : null;

      await this.prisma.user.update({
        where: { userId: user.userId },
        data: {
          failedAttempts: nextFailedAttempts,
          status: shouldBlock ? 'blocked' : user.status,
          blockedUntil,
        },
      });

      if (shouldBlock) {
        try {
          await this.mailService.sendAccountBlockedNotification(
            user.email,
            user.firstName,
            blockedUntil ?? now,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'unknown error';
          this.logger.warn(
            `No se pudo enviar correo de bloqueo a ${user.email}: ${message}`,
          );
        }

        throw new UnauthorizedException({
          message: 'Cuenta bloqueada temporalmente por múltiples intentos fallidos',
          accountBlocked: true,
          blockedUntil,
          remainingBlockSeconds: this.calculateRemainingBlockSeconds(
            blockedUntil,
            now,
          ),
          requiresCaptcha: true,
          failedAttempts: nextFailedAttempts,
          attemptsRemaining: 0,
        });
      }

      throw new UnauthorizedException({
        message: 'Credenciales inválidas',
        requiresCaptcha:
          nextFailedAttempts >= CAPTCHA_AFTER_FAILED_ATTEMPTS,
        failedAttempts: nextFailedAttempts,
        attemptsRemaining: Math.max(
          0,
          MAX_LOGIN_FAILED_ATTEMPTS - nextFailedAttempts,
        ),
      });
    }

    if (user.failedAttempts > 0 || user.blockedUntil) {
      await this.prisma.user.update({
        where: { userId: user.userId },
        data: {
          failedAttempts: 0,
          blockedUntil: null,
        },
      });
    }

    const { passwordHash: _passwordHash, admin, ...safeUser } = user;
    return {
      ...safeUser,
      isTemporaryPassword: admin?.isTemporaryPassword ?? false,
    };
  }

  async login(user: AuthenticatedUser): Promise<LoginResponseDto> {
    const payload: JwtPayload = {
      sub: user.userId,
      role: user.userType,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '1h',
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        dni: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        birthDate: true,
        birthPlace: true,
        address: true,
        gender: true,
        userType: true,
        status: true,
        registrationDate: true,
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

    return {
      ...user,
      isTemporaryPassword: user.admin?.isTemporaryPassword ?? false,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email, recaptchaToken } = dto;

    const isHuman = await this.recaptchaService.verify(recaptchaToken);
    if (!isHuman) {
      throw new UnauthorizedException('ReCAPTCHA verification failed');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'Si el correo existe, recibirás un enlace.' };
    }

    const rawToken = await this.generateResetToken();
    const tokenHash = await bcrypt.hash(rawToken, BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + 3600000);

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.userId },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.userId,
        tokenHash,
        expiresAt,
      },
    });

    try {
      await this.mailService.sendPasswordReset(email, rawToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `No se pudo enviar correo de reset para ${email}: ${message}`,
      );
    }

    return { message: 'Si el correo existe, recibirás un enlace.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword, recaptchaToken } = dto;

    const isHuman = await this.recaptchaService.verify(recaptchaToken);
    if (!isHuman) {
      throw new UnauthorizedException('ReCAPTCHA verification failed');
    }

    const candidateTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { id: 'desc' },
      take: 200,
    });

    let resetToken: (typeof candidateTokens)[number] | null = null;
    for (const candidate of candidateTokens) {
      const isMatch = await bcrypt.compare(token, candidate.tokenHash);
      if (isMatch) {
        resetToken = candidate;
        break;
      }
    }

    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
      throw new UnauthorizedException(
        'Enlace de restablecimiento inválido o expirado.',
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.user.update({
      where: { userId: resetToken.userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Tu contraseña ha sido restablecida con éxito.' };
  }

  async register(dto: RegisterDto) {
    const { email, username, password, categoryIds } = dto;

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    if (categoryIds && categoryIds.length > 0) {
      const categories = await this.prisma.category.findMany({
        where: { categoryId: { in: categoryIds } },
      });
      if (categories.length !== categoryIds.length) {
        throw new BadRequestException('Some categories do not exist');
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        dni: dto.dni,
        firstName: dto.firstName,
        lastName: dto.lastName,
        birthDate: new Date(dto.birthDate),
        birthPlace: dto.birthPlace,
        address: dto.address,
        gender: dto.gender,
        email,
        username,
        passwordHash,
        userType: 'client',
        status: 'active',
      },
    });

    const client = await this.prisma.client.create({
      data: { userId: user.userId },
    });

    if (categoryIds && categoryIds.length > 0) {
      await this.prisma.userPreference.createMany({
        data: categoryIds.map((categoryId) => ({
          clientId: client.clientId,
          categoryId,
        })),
      });
    }

    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createAdmin(dto: CreateAdminDto, rootUserId: number) {
    const { email, username } = dto;

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

    const adminUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          dni: dto.dni,
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: new Date(dto.birthDate),
          birthPlace: dto.birthPlace,
          address: dto.address,
          gender: dto.gender,
          email,
          username,
          passwordHash,
          userType: 'admin',
          status: 'active',
        },
      });

      await tx.admin.create({
        data: {
          userId: user.userId,
          createdByRootId: rootUserId,
          isTemporaryPassword: true,
        },
      });

      return user;
    });

    await this.mailService.sendAdminTemporaryPassword(
      email,
      username,
      temporaryPassword,
    );

    const { passwordHash: _passwordHash, ...safeUser } = adminUser;
    return safeUser;
  }

  /**
   * Desactiva un administrador (soft delete). Solo root.
   * No borra filas; el historial (AuditLog, etc.) permanece intacto.
   * Las sesiones del admin quedan invalidadas al rechazar status !== 'active' en JWT.
   */
  async deactivateAdmin(adminUserId: number, rootUserId: number) {
    const adminRecord = await this.prisma.admin.findUnique({
      where: { userId: adminUserId },
      include: { user: true },
    });

    if (
      !adminRecord ||
      adminRecord.user.userType !== 'admin' ||
      adminRecord.user.status === 'inactive'
    ) {
      throw new NotFoundException(
        'Administrador no encontrado o ya está inactivo',
      );
    }

    if (adminUserId === rootUserId) {
      throw new ForbiddenException('No puede desactivar su propia cuenta');
    }

    await this.prisma.user.update({
      where: { userId: adminUserId },
      data: { status: 'inactive' },
    });

    return { message: 'Administrador desactivado correctamente' };
  }

  async validateUniqueFields(email: string, username: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing?.email === email) {
      throw new ConflictException('El email ya está registrado');
    }
    if (existing?.username === username) {
      throw new ConflictException('El nombre de usuario ya está en uso');
    }
  }

  private handlePrismaError(error: any) {
    if (error.code === 'P2002') {
      throw new ConflictException('Dato duplicado');
    }
    throw error;
  }

  private async generateResetToken(): Promise<string> {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const entropyPart = salt
      .replace(/^\$2[abxy]\$\d+\$/, '')
      .replace(/\//g, '_');
    const timestampPart = Date.now().toString(36);
    return `${timestampPart}.${entropyPart}`;
  }

  private generateTemporaryPassword(length = 12): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';

    const all = upper + lower + digits + symbols;

    const pick = (charset: string) =>
      charset[Math.floor(Math.random() * charset.length)];

    const requiredChars = [
      pick(upper),
      pick(lower),
      pick(digits),
      pick(symbols),
    ];

    const remainingLength = Math.max(length - requiredChars.length, 0);
    const remainingChars = Array.from({ length: remainingLength }, () =>
      pick(all),
    );

    const passwordChars = [...requiredChars, ...remainingChars];

    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    return passwordChars.join('');
  }

  private calculateBlockedUntil(baseDate: Date): Date {
    const lockDurationMinutesRaw = this.configService.get<string>(
      'AUTH_LOCK_DURATION_MINUTES',
    );
    const lockDurationMinutes = Number.parseInt(lockDurationMinutesRaw ?? '', 10);
    const durationMinutes = Number.isFinite(lockDurationMinutes)
      ? lockDurationMinutes
      : DEFAULT_LOCK_DURATION_MINUTES;
    return new Date(baseDate.getTime() + durationMinutes * 60_000);
  }

  private calculateRemainingBlockSeconds(
    blockedUntil: Date | null,
    now: Date,
  ): number {
    if (!blockedUntil) {
      return 0;
    }

    const millisecondsRemaining = blockedUntil.getTime() - now.getTime();
    return Math.max(0, Math.ceil(millisecondsRemaining / 1000));
  }
}
