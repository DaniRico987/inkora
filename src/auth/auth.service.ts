import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RecaptchaService } from '../recaptcha/recaptcha.service';
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
    const expiresAt = new Date(Date.now() + 1800000); // 30 minutes

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

    if (!resetToken) {
      throw new UnauthorizedException('Enlace de restablecimiento inválido.');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'El enlace de restablecimiento ha expirado.',
      );
    }

    if (resetToken.usedAt) {
      throw new UnauthorizedException(
        'El enlace de restablecimiento ya ha sido usado.',
      );
    }

    // 4. Update password using bcrypt
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
}
