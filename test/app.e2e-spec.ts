import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Roles } from '../src/auth/roles.decorator';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { RecaptchaService } from '../src/recaptcha/recaptcha.service';

@Controller('secure')
class SecureTestController {
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile() {
    return { ok: true };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminOnly() {
    return { ok: true };
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prismaMock: {
    user: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const users = [
    {
      userId: 1,
      email: 'admin@inkora.com',
      username: 'adminuser',
      firstName: 'Admin',
      lastName: 'User',
      userType: 'admin' as const,
      status: 'active' as const,
      passwordHash: '',
    },
    {
      userId: 2,
      email: 'client@inkora.com',
      username: 'clientuser',
      firstName: 'Client',
      lastName: 'User',
      userType: 'client' as const,
      status: 'active' as const,
      passwordHash: '',
    },
  ];

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';

    users[0].passwordHash = await bcrypt.hash('AdminPass123!', 4);
    users[1].passwordHash = await bcrypt.hash('ClientPass123!', 4);

    prismaMock = {
      user: {
        findFirst: jest.fn(({ where }: { where: { OR: Array<{ email?: string; username?: string }> } }) => {
          const email = where?.OR?.find((item) => item.email)?.email;
          const username = where?.OR?.find((item) => item.username)?.username;
          return (
            users.find(
              (u) => u.email === email || u.username === username,
            ) ?? null
          );
        }),
        findUnique: jest.fn(({ where }: { where: { userId?: number } }) => {
          return users.find((u) => u.userId === where.userId) ?? null;
        }),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [SecureTestController],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RecaptchaService)
      .useValue({ verify: jest.fn().mockResolvedValue(true) })
      .overrideProvider(MailService)
      .useValue({ sendPasswordReset: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          if (key === 'JWT_SECRET') {
            return 'test-secret';
          }
          if (key === 'JWT_EXPIRES_IN') {
            return '1h';
          }
          return undefined;
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login succeeds with email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'admin@inkora.com',
        password: 'AdminPass123!',
        recaptchaToken: 'captcha-ok',
      })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.tokenType).toBe('Bearer');
  });

  it('POST /auth/login succeeds with username', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'adminuser',
        password: 'AdminPass123!',
        recaptchaToken: 'captcha-ok',
      })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.tokenType).toBe('Bearer');
  });

  it('POST /auth/login returns same generic message for invalid credentials', async () => {
    const wrongUserResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'unknown@inkora.com',
        password: 'WrongPass123!',
        recaptchaToken: 'captcha-ok',
      })
      .expect(401);

    const wrongPasswordResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'admin@inkora.com',
        password: 'WrongPass123!',
        recaptchaToken: 'captcha-ok',
      })
      .expect(401);

    expect(wrongUserResponse.body.message).toBe('Credenciales inválidas');
    expect(wrongPasswordResponse.body.message).toBe('Credenciales inválidas');
  });

  it('protected endpoint denies invalid JWT and allows valid JWT', async () => {
    await request(app.getHttpServer())
      .get('/secure/profile')
      .set('Authorization', 'Bearer invalid.token.value')
      .expect(401);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'admin@inkora.com',
        password: 'AdminPass123!',
        recaptchaToken: 'captcha-ok',
      })
      .expect(200);

    return request(app.getHttpServer())
      .get('/secure/profile')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200)
      .expect({ ok: true });
  });

  it('roles endpoint allows admin and denies client', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'admin@inkora.com',
        password: 'AdminPass123!',
        recaptchaToken: 'captcha-ok',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/secure/admin')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .expect(200)
      .expect({ ok: true });

    const clientLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'client@inkora.com',
        password: 'ClientPass123!',
        recaptchaToken: 'captcha-ok',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/secure/admin')
      .set('Authorization', `Bearer ${clientLogin.body.accessToken}`)
      .expect(403);
  });
});
