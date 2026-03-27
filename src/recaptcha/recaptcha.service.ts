import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secret: string;
  private readonly enabled: boolean;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('RECAPTCHA_SECRET') ?? '';
    const enabledRaw = this.configService.get<string>('RECAPTCHA_ENABLED');
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';
    this.isProduction = nodeEnv === 'production';
    // Default: enabled unless explicitly set to "false"
    this.enabled = enabledRaw == null ? true : enabledRaw.toLowerCase() !== 'false';
  }

  async verify(token: string): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    // Development fallback while frontend reCAPTCHA widget is not integrated.
    if (!this.isProduction && token === 'captcha-ok') {
      this.logger.warn(
        'Using development placeholder token for reCAPTCHA verification',
      );
      return true;
    }

    if (!this.secret) {
      if (this.isProduction) {
        this.logger.error('RECAPTCHA_SECRET is not configured in production');
        return false;
      }

      this.logger.warn(
        'RECAPTCHA_SECRET is not configured; skipping verification in non-production',
      );
      return true;
    }

    if (!token) return false;

    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(this.secret)}&response=${encodeURIComponent(token)}`,
        },
      );

      const data = (await response.json()) as {
        success: boolean;
        'error-codes'?: string[];
      };

      if (!data.success) {
        this.logger.warn(
          `reCAPTCHA verification failed: ${data['error-codes']?.join(', ')}`,
        );
      }

      return data.success;
    } catch (error) {
      this.logger.error('Error verifying reCAPTCHA', error);
      return false;
    }
  }
}
