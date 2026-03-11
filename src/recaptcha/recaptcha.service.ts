import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>('RECAPTCHA_SECRET');
  }

  async verify(token: string): Promise<boolean> {
    if (!token) return false;

    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${this.secret}&response=${token}`,
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
