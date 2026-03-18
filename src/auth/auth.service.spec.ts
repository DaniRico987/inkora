import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RecaptchaService } from '../recaptcha/recaptcha.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let recaptchaService: {
    verify: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };
  let mailService: {
    sendPasswordReset: jest.Mock;
    sendAccountBlockedNotification: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    recaptchaService = {
      verify: jest.fn().mockResolvedValue(true),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '1h';
        if (key === 'AUTH_LOCK_DURATION_MINUTES') return '15';
        return undefined;
      }),
    };

    mailService = {
      sendPasswordReset: jest.fn(),
      sendAccountBlockedNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: RecaptchaService,
          useValue: recaptchaService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return safe user when credentials are correct', async () => {
      const passwordHash = await bcrypt.hash('S3gura123!', 4);
      prisma.user.findFirst.mockResolvedValue({
        userId: 10,
        email: 'admin@inkora.com',
        username: 'adminuser',
        firstName: 'Ada',
        lastName: 'Lovelace',
        userType: 'admin',
        status: 'active',
        failedAttempts: 0,
        blockedUntil: null,
        passwordHash,
        admin: {
          isTemporaryPassword: false,
        },
      });

      const result = await service.validateUser(
        'admin@inkora.com',
        'S3gura123!',
        'captcha-token',
      );

      expect(recaptchaService.verify).not.toHaveBeenCalled();
      expect(prisma.user.findFirst).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 10,
        email: 'admin@inkora.com',
        username: 'adminuser',
        firstName: 'Ada',
        lastName: 'Lovelace',
        userType: 'admin',
        status: 'active',
        failedAttempts: 0,
        blockedUntil: null,
        isTemporaryPassword: false,
      });
    });

    it('should throw generic unauthorized error when user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.validateUser('unknown@inkora.com', 'WrongPass123', 'captcha'),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.validateUser('unknown@inkora.com', 'WrongPass123', 'captcha'),
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw generic unauthorized error when password is incorrect', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass123', 4);
      prisma.user.findFirst.mockResolvedValue({
        userId: 20,
        email: 'client@inkora.com',
        username: 'clientuser',
        firstName: 'Jane',
        lastName: 'Doe',
        userType: 'client',
        status: 'active',
        failedAttempts: 0,
        blockedUntil: null,
        passwordHash,
        admin: null,
      });

      await expect(
        service.validateUser('clientuser', 'IncorrectPass', 'captcha'),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.validateUser('clientuser', 'IncorrectPass', 'captcha'),
      ).rejects.toThrow('Credenciales inválidas');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userId: 20 },
        data: {
          failedAttempts: 1,
          status: 'active',
          blockedUntil: null,
        },
      });
    });

    it('should require recaptcha after third failed attempt', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass123', 4);
      prisma.user.findFirst.mockResolvedValue({
        userId: 21,
        email: 'client2@inkora.com',
        username: 'clientuser2',
        firstName: 'Ana',
        lastName: 'Doe',
        userType: 'client',
        status: 'active',
        failedAttempts: 3,
        blockedUntil: null,
        passwordHash,
        admin: null,
      });
      recaptchaService.verify.mockResolvedValue(false);

      await expect(
        service.validateUser('clientuser2', 'IncorrectPass', ''),
      ).rejects.toThrow('ReCAPTCHA verification failed');

      expect(recaptchaService.verify).toHaveBeenCalledWith('');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should block account on fifth failed attempt and notify by email', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass123', 4);
      prisma.user.findFirst.mockResolvedValue({
        userId: 30,
        email: 'blocked@inkora.com',
        username: 'blockeduser',
        firstName: 'Blocked',
        lastName: 'User',
        userType: 'client',
        status: 'active',
        failedAttempts: 4,
        blockedUntil: null,
        passwordHash,
        admin: null,
      });
      recaptchaService.verify.mockResolvedValue(true);

      await expect(
        service.validateUser('blockeduser', 'IncorrectPass', 'captcha-token'),
      ).rejects.toThrow('Cuenta bloqueada temporalmente por múltiples intentos fallidos');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 30 },
          data: expect.objectContaining({
            failedAttempts: 5,
            status: 'blocked',
          }),
        }),
      );
      expect(mailService.sendAccountBlockedNotification).toHaveBeenCalled();
    });

    it('should reset failed attempts after successful login', async () => {
      const passwordHash = await bcrypt.hash('S3gura123!', 4);
      prisma.user.findFirst.mockResolvedValue({
        userId: 31,
        email: 'reset@inkora.com',
        username: 'resetuser',
        firstName: 'Reset',
        lastName: 'User',
        userType: 'client',
        status: 'active',
        failedAttempts: 2,
        blockedUntil: null,
        passwordHash,
        admin: null,
      });

      await service.validateUser('resetuser', 'S3gura123!', '');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { userId: 31 },
        data: {
          failedAttempts: 0,
          blockedUntil: null,
        },
      });
    });
  });

  describe('login', () => {
    it('should sign token with sub and role claims', async () => {
      const user = {
        userId: 33,
        email: 'root@inkora.com',
        username: 'rootuser',
        firstName: 'Root',
        lastName: 'User',
        userType: 'root' as const,
        status: 'active' as const,
      };

      await service.login(user);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 33,
        role: 'root',
      });
    });
  });
});
