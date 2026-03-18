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

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
      },
    };

    recaptchaService = {
      verify: jest.fn().mockResolvedValue(true),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    };

    configService = {
      get: jest.fn().mockReturnValue('1h'),
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
          useValue: { sendPasswordReset: jest.fn() },
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
        passwordHash,
      });

      const result = await service.validateUser(
        'admin@inkora.com',
        'S3gura123!',
        'captcha-token',
      );

      expect(recaptchaService.verify).toHaveBeenCalledWith('captcha-token');
      expect(prisma.user.findFirst).toHaveBeenCalled();
      expect(result).toEqual({
        userId: 10,
        email: 'admin@inkora.com',
        username: 'adminuser',
        firstName: 'Ada',
        lastName: 'Lovelace',
        userType: 'admin',
        status: 'active',
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
        passwordHash,
      });

      await expect(
        service.validateUser('clientuser', 'IncorrectPass', 'captcha'),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.validateUser('clientuser', 'IncorrectPass', 'captcha'),
      ).rejects.toThrow('Credenciales inválidas');
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
