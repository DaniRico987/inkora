import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

import { existsSync } from 'fs';

describe('MailService', () => {
  const sendMailMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });
  });

  it('should attach logo as cid when MAIL_LOGO_PATH exists', async () => {
    (existsSync as jest.Mock).mockReturnValue(true);

    const configValues: Record<string, string> = {
      MAIL_HOST: 'smtp.gmail.com',
      MAIL_PORT: '465',
      MAIL_USER: 'user@example.com',
      MAIL_PASSWORD: 'secret',
      MAIL_FROM: 'INKORA <user@example.com>',
      FRONTEND_URL: 'http://localhost:5173',
      MAIL_LOGO_PATH: './public/branding/inkora-logo.png',
    };

    const configService = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    const service = new MailService(configService);

    await service.sendPasswordReset('cliente@example.com', 'token-123');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailPayload = sendMailMock.mock.calls[0][0];

    expect(mailPayload.attachments).toEqual([
      {
        filename: 'inkora-logo.png',
        path: './public/branding/inkora-logo.png',
        cid: 'inkora-logo',
      },
    ]);
    expect(mailPayload.html).toContain('src="cid:inkora-logo"');
  });
});
