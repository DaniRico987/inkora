import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RecaptchaService } from '../recaptcha/recaptcha.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };
  const mockRecaptchaService = { verify: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: RecaptchaService, useValue: mockRecaptchaService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
