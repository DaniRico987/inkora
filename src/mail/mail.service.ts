import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import {
  buildAccountBlockedTemplate,
  buildAdminTemporaryPasswordTemplate,
  buildPasswordResetTemplate,
} from './mail.templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly logoUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const host = this.getRequiredConfig('MAIL_HOST');
    const portRaw = this.getRequiredConfig('MAIL_PORT');
    const user = this.getRequiredConfig('MAIL_USER');
    const pass = this.getRequiredConfig('MAIL_PASSWORD');
    const secure = Number.parseInt(portRaw, 10) === 465;
    this.logoUrl = this.resolveLogoUrl();

    const transportOptions: SMTPTransport.Options = {
      host,
      port: Number.parseInt(portRaw, 10),
      secure,
      auth: {
        user,
        pass,
      },
    };

    this.transporter = nodemailer.createTransport(transportOptions);
  }

  async sendPasswordReset(email: string, token: string) {
    const frontendUrl = this.getRequiredConfig('FRONTEND_URL');
    const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password/${encodeURIComponent(token)}`;
    const template = buildPasswordResetTemplate(
      { resetLink },
      { logoUrl: this.logoUrl },
    );

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendAdminTemporaryPassword(
    email: string,
    username: string,
    temporaryPassword: string,
  ) {
    const template = buildAdminTemporaryPasswordTemplate({
      username,
      temporaryPassword,
    },
    {
      logoUrl: this.logoUrl,
    });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendAccountBlockedNotification(
    email: string,
    firstName: string,
    blockedUntil: Date,
  ) {
    const blockedUntilIso = blockedUntil.toISOString();
    const template = buildAccountBlockedTemplate({
      firstName,
      blockedUntilIso,
    },
    {
      logoUrl: this.logoUrl,
    });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    this.logger.warn(
      `Notificacion de bloqueo enviada a ${email} hasta ${blockedUntilIso}`,
    );
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new Error(`Falta variable de entorno requerida: ${key}`);
    }
    return value;
  }

  private resolveLogoUrl(): string | undefined {
    const explicitLogoUrl = this.configService.get<string>('MAIL_LOGO_URL')?.trim();
    if (explicitLogoUrl) {
      return explicitLogoUrl;
    }

    const apiUrl = this.configService.get<string>('API_URL')?.trim() || 
                   `http://localhost:${this.configService.get<string>('PORT') || '3000'}`;
    
    return `${apiUrl.replace(/\/$/, '')}/branding/inkora-logo.png`;
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const from = this.getRequiredConfig('MAIL_FROM');
    const replyTo = this.configService.get<string>('MAIL_REPLY_TO')?.trim();

    await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(replyTo ? { replyTo } : {}),
    });

    this.logger.log(`Correo enviado a ${params.to} con asunto "${params.subject}"`);
  }
}
