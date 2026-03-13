import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendPasswordReset(email: string, token: string) {
    // In a real application, you would send an email here using a provider like SendGrid or SMTP.
    // For now, we will just log the token for development purposes.
    this.logger.log(
      `Enviando enlace de restablecimiento de contraseña a ${email}. Token: ${token}`,
    );
  }
}
