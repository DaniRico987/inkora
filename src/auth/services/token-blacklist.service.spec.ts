import { Test, TestingModule } from '@nestjs/testing';
import { TokenBlacklistService } from './token-blacklist.service';
import { PrismaService } from 'prisma/prisma/prisma.service';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let prisma: PrismaService;

  const mockPrisma = {
    tokenBlacklist: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('revokeToken', () => {
    it('debería revocar un token exitosamente', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImV4cCI6MTc1MzExNDAwMH0.test';
      const userId = 1;

      mockPrisma.tokenBlacklist.create.mockResolvedValue({
        id: 1,
        tokenHash: expect.any(String),
        userId,
        reason: 'user_logout',
      });

      await service.revokeToken(token, userId);

      expect(mockPrisma.tokenBlacklist.create).toHaveBeenCalled();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('debería retornar true si token está en blacklist', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImV4cCI6MTc1MzExNDAwMH0.test';

      mockPrisma.tokenBlacklist.findUnique.mockResolvedValue({
        id: 1,
        tokenHash: expect.any(String),
      });

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(true);
    });

    it('debería retornar false si token no está en blacklist', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImV4cCI6MTc1MzExNDAwMH0.test';

      mockPrisma.tokenBlacklist.findUnique.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted(token);

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('debería limpiar tokens expirados', async () => {
      mockPrisma.tokenBlacklist.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockPrisma.tokenBlacklist.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('getBlacklistStats', () => {
    it('debería retornar estadísticas de tokens revocados', async () => {
      mockPrisma.tokenBlacklist.count.mockResolvedValue(10);
      mockPrisma.tokenBlacklist.groupBy.mockResolvedValue([
        { reason: 'user_logout', _count: 7 },
        { reason: 'password_change', _count: 3 },
      ]);

      const result = await service.getBlacklistStats();

      expect(result.totalRevoked).toBe(10);
      expect(result.byReason['user_logout']).toBe(7);
      expect(result.byReason['password_change']).toBe(3);
    });
  });
});
