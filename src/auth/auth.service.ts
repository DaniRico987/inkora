import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
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

@Injectable()
export class AuthService {
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
    const isHuman = await this.recaptchaService.verify(recaptchaToken);
    if (!isHuman) {
      throw new UnauthorizedException('ReCAPTCHA verification failed');
    }

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
        passwordHash: true,
        admin: {
          select: {
            isTemporaryPassword: true,
          },
        },
      },
    });

    const genericError = new UnauthorizedException('Credenciales inválidas');
    if (!user || user.status !== 'active') {
      throw genericError;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw genericError;
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

    await this.mailService.sendPasswordReset(email, rawToken);

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
}
