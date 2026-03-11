import { Test, TestingModule } from '@nestjs/testing';
import { RecaptchaService } from './recaptcha.service';
import { ConfigService } from '@nestjs/config';

describe('RecaptchaService', () => {
  let service: RecaptchaService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock_secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecaptchaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RecaptchaService>(RecaptchaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
