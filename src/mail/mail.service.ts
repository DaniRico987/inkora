import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import {
  buildAccountBlockedTemplate,
  buildAdminTemporaryPasswordTemplate,
  buildNewBookNotificationTemplate,
  buildPasswordResetTemplate,
  buildPurchaseInvoiceTemplate,
} from './mail.templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly logoUrl: string | undefined;
  private readonly logoPath: string | undefined;
  private readonly logoCid: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const host = this.getRequiredConfig('MAIL_HOST');
    const portRaw = this.getRequiredConfig('MAIL_PORT');
    const user = this.getRequiredConfig('MAIL_USER');
    const pass = this.getRequiredConfig('MAIL_PASSWORD');
    const secure = Number.parseInt(portRaw, 10) === 465;
    const logoConfig = this.resolveLogoConfig();
    this.logoUrl = logoConfig.logoUrl;
    this.logoPath = logoConfig.logoPath;
    this.logoCid = logoConfig.logoCid;

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
      { logoUrl: this.logoUrl, logoCid: this.logoCid },
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
    const template = buildAdminTemporaryPasswordTemplate(
      {
        username,
        temporaryPassword,
      },
      {
        logoUrl: this.logoUrl,
        logoCid: this.logoCid,
      },
    );

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
    const template = buildAccountBlockedTemplate(
      {
        firstName,
        blockedUntilIso,
      },
      {
        logoUrl: this.logoUrl,
        logoCid: this.logoCid,
      },
    );

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

  async sendPurchaseInvoice(
    email: string,
    params: {
      firstName: string;
      purchaseId: number;
      purchaseDateIso: string;
      totalAmount: number;
      paymentMethod?: string;
      shippingAddress?: string;
      deliveryMode?: 'homeDelivery' | 'storePickup';
      pickupStoreName?: string;
      estimatedDeliveryTime?: string;
      status: 'inPreparation' | 'shipped' | 'delivered' | 'cancelled';
      items: Array<{
        title: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }>;
    },
  ) {
    const template = buildPurchaseInvoiceTemplate(params, {
      logoUrl: this.logoUrl,
      logoCid: this.logoCid,
    });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendNewBookNotification(
    email: string,
    firstName: string,
    bookTitle: string,
    bookAuthor: string,
    categories: string[],
    notificationId: number,
  ) {
    const template = buildNewBookNotificationTemplate(
      {
        firstName,
        bookTitle,
        bookAuthor,
        categories,
      },
      {
        logoUrl: this.logoUrl,
        logoCid: this.logoCid,
      },
    );

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) {
      throw new Error(`Falta variable de entorno requerida: ${key}`);
    }
    return value;
  }

  private resolveLogoConfig(): {
    logoUrl?: string;
    logoPath?: string;
    logoCid?: string;
  } {
    const explicitLogoPath = this.configService
      .get<string>('MAIL_LOGO_PATH')
      ?.trim();
    const cid = 'inkora-logo';

    if (explicitLogoPath) {
      if (existsSync(explicitLogoPath)) {
        return {
          logoPath: explicitLogoPath,
          logoCid: cid,
        };
      }

      this.logger.warn(
        `MAIL_LOGO_PATH no existe o no es accesible: ${explicitLogoPath}. Se usara fallback por URL.`,
      );
    }

    const defaultLogoPath = join(
      process.cwd(),
      'public',
      'branding',
      'inkora-logo.png',
    );
    if (existsSync(defaultLogoPath)) {
      return {
        logoPath: defaultLogoPath,
        logoCid: cid,
      };
    }

    const explicitLogoUrl = this.configService
      .get<string>('MAIL_LOGO_URL')
      ?.trim();
    if (explicitLogoUrl) {
      return { logoUrl: explicitLogoUrl };
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim();
    if (frontendUrl) {
      return {
        logoUrl: `${frontendUrl.replace(/\/$/, '')}/branding/inkora-logo.png`,
      };
    }

    const apiUrl =
      this.configService.get<string>('API_URL')?.trim() ||
      `http://localhost:${this.configService.get<string>('PORT') || '3000'}`;

    return {
      logoUrl: `${apiUrl.replace(/\/$/, '')}/branding/inkora-logo.png`,
    };
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const from = this.getRequiredConfig('MAIL_FROM');
    const replyTo = this.configService.get<string>('MAIL_REPLY_TO')?.trim();
    const attachments = this.logoPath
      ? [
          {
            filename: 'inkora-logo.png',
            path: this.logoPath,
            cid: this.logoCid || 'inkora-logo',
          },
        ]
      : undefined;

    await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments ? { attachments } : {}),
    });

    this.logger.log(
      `Correo enviado a ${params.to} con asunto "${params.subject}"`,
    );
  }
}
