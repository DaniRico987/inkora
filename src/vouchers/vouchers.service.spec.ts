import { VouchersService } from './vouchers.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('VouchersService', () => {
  let service: VouchersService;
  const mockPrisma: any = {
    voucher: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockMailService: any = {
    sendBirthdayVoucher: jest.fn(),
  };

  const mockConfig: any = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'API_URL') return 'http://localhost:3000';
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore - use object with same shape
    service = new VouchersService(mockPrisma, mockMailService, mockConfig);
  });

  it('createBirthdayVoucher: creates voucher and sends email', async () => {
    const user = { userId: 42, firstName: 'Ana', email: 'ana@example.com' };

    mockPrisma.voucher.create.mockResolvedValueOnce({ id: 7, code: 'BIRTH-42-abc', userId: 42 });

    const voucher = await service.createBirthdayVoucher(user as any);

    expect(mockPrisma.voucher.create).toHaveBeenCalled();
    expect(mockMailService.sendBirthdayVoucher).toHaveBeenCalledWith(
      user.email,
      user.firstName,
      expect.stringContaining('/vouchers/'),
      expect.any(String),
    );

    expect(voucher).toBeDefined();
    expect(voucher.id).toBe(7);
  });

  it('getVoucherIfAuthorized: allows admin access', async () => {
    const voucher = { id: 10, userId: 5, pdfBase64: 'xxx' };
    mockPrisma.voucher.findUnique.mockResolvedValueOnce(voucher);

    const adminUser = { userId: 1, userType: 'admin' } as any;

    const result = await service.getVoucherIfAuthorized(10, adminUser);
    expect(result).toBe(voucher);
  });

  it('getVoucherIfAuthorized: forbids non-owner non-admin', async () => {
    const voucher = { id: 11, userId: 8, pdfBase64: 'yyy' };
    mockPrisma.voucher.findUnique.mockResolvedValueOnce(voucher);

    const otherUser = { userId: 9, userType: 'client' } as any;

    await expect(service.getVoucherIfAuthorized(11, otherUser)).rejects.toThrow(ForbiddenException);
  });

  it('getVoucherIfAuthorized: throws not found when missing', async () => {
    mockPrisma.voucher.findUnique.mockResolvedValueOnce(null);
    const user = { userId: 1, userType: 'client' } as any;
    await expect(service.getVoucherIfAuthorized(999, user)).rejects.toThrow(NotFoundException);
  });
});

export {};
