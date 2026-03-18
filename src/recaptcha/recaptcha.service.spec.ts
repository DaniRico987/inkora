import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RecaptchaService } from './recaptcha.service';

describe('RecaptchaService', () => {
  let service: RecaptchaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecaptchaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'RECAPTCHA_SECRET') {
                return 'test-secret';
              }
              if (key === 'RECAPTCHA_ENABLED') {
                return 'false';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RecaptchaService>(RecaptchaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
