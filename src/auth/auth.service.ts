import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RecaptchaService } from '../recaptcha/recaptcha.service';
import { RegisterDto } from './dto/register.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email, recaptchaToken } = dto;

    // 1. Verify reCAPTCHA
    const isHuman = await this.recaptchaService.verify(recaptchaToken);
    if (!isHuman) {
      throw new UnauthorizedException('ReCAPTCHA verification failed');
    }

    // 2. Look up user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // 3. Silent fail if user not found
    if (!user) {
      return { message: 'Si el correo existe, recibirás un enlace.' };
    }

    // 4. Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // 5. Upsert token (cleanup old ones first)
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

    // 6. Send mail
    await this.mailService.sendPasswordReset(email, rawToken);

    return { message: 'Si el correo existe, recibirás un enlace.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword, recaptchaToken } = dto;

    // 1. Verify reCAPTCHA
    const isHuman = await this.recaptchaService.verify(recaptchaToken);
    if (!isHuman) {
      throw new UnauthorizedException('ReCAPTCHA verification failed');
    }

    // 2. Hash the incoming token to find it in the DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Find valid token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
      throw new UnauthorizedException(
        'Enlace de restablecimiento inválido o expirado.',
      );
    }

    // 4. Update password using bcrypt (10 salts)
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { userId: resetToken.userId },
      data: { passwordHash: newPasswordHash },
    });

    // 5. Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Tu contraseña ha sido restablecida con éxito.' };
  }
  async register(dto: RegisterDto) {
    const { email, username, password, categoryIds } = dto;

    // 1. Check email uniqueness
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // 2. Check username uniqueness
    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // 3. Validate categoryIds exist
    if (categoryIds && categoryIds.length > 0) {
      const categories = await this.prisma.category.findMany({
        where: { categoryId: { in: categoryIds } },
      });
      if (categories.length !== categoryIds.length) {
        throw new BadRequestException('Some categories do not exist');
      }
    }

    // 4. Hash password with bcrypt (10 salts)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. Create user
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

    // 6. Create client
    const client = await this.prisma.client.create({
      data: { userId: user.userId },
    });

    // 7. Create user preferences
    if (categoryIds && categoryIds.length > 0) {
      await this.prisma.userPreference.createMany({
        data: categoryIds.map((categoryId) => ({
          clientId: client.clientId,
          categoryId,
        })),
      });
    }

    // 8. Return user without passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  async validateUniqueFields(email: string, username: string) {
  const existing = await this.prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing?.email === email)
    throw new ConflictException('El email ya está registrado');
  if (existing?.username === username)
    throw new ConflictException('El nombre de usuario ya está en uso');
}

private handlePrismaError(error: any) {
  if (error.code === 'P2002') {
    throw new ConflictException('Dato duplicado');
  }
  throw error;
}
}

