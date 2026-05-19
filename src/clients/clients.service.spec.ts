import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let service: ClientsService;

  const mockPrisma: any = {
    client: {
      findUnique: jest.fn(),
    },
    paymentCard: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    subscription: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore - prisma mock shape for service tests
    service = new ClientsService(mockPrisma);
  });

  it('getMyProfile: includes active birthday voucher when present', async () => {
    const userVouchers = [
      {
        code: 'BIRTH-42-abc',
        discountPercentage: 10,
        expiresAt: new Date('2026-05-19T01:00:00.000Z'),
        createdAt: new Date('2026-05-18T01:00:00.000Z'),
      },
    ];

    mockPrisma.client.findUnique.mockResolvedValueOnce({
      clientId: 7,
      userId: 42,
      user: {
        dni: '123456789',
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@example.com',
        username: 'ana.perez',
        birthDate: new Date('1990-05-18T00:00:00.000Z'),
        birthPlace: 'Pereira',
        address: 'Calle 1 #2-3',
        gender: 'Femenino',
        vouchers: userVouchers,
      },
      subscriptions: [],
      paymentCards: [],
    });

    const result = await service.getMyProfile(42);

    expect(result.activeBirthdayVoucher).toEqual({
      code: 'BIRTH-42-abc',
      discountPercentage: 10,
      expiresAt: userVouchers[0].expiresAt,
      generatedAt: userVouchers[0].createdAt,
    });
  });
});
