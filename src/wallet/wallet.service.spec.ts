import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: {
    client: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    transaction: {
      findFirst: jest.Mock;
      count: jest.Mock;
      aggregate: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      client: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        findFirst: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(WalletService);
  });

  it('debe devolver el resumen del monedero', async () => {
    prisma.client.findUnique.mockResolvedValue({
      clientId: 10,
      walletBalance: '125000',
      paymentCards: [{ cardId: 1 }, { cardId: 2 }],
    });
    prisma.transaction.findFirst.mockResolvedValue({
      transactionId: 21,
      transactionType: TransactionType.refund,
      amount: '5000',
      balanceAfter: '125000',
      transactionDate: new Date('2026-05-13T12:00:00.000Z'),
    });
    prisma.transaction.count.mockResolvedValue(3);
    prisma.transaction.aggregate.mockResolvedValueOnce({ _sum: { amount: '214900' } });
    prisma.transaction.aggregate.mockResolvedValueOnce({ _sum: { amount: '5000' } });

    const result = await service.getWallet(10);

    expect(result).toEqual({
      clientId: 10,
      availableBalance: 125000,
      totalPayments: 214900,
      totalRefunds: 5000,
      transactionCount: 3,
      activeCardsCount: 2,
      lastTransaction: {
        transactionId: 21,
        transactionType: TransactionType.refund,
        amount: 5000,
        balanceAfter: 125000,
        transactionDate: new Date('2026-05-13T12:00:00.000Z'),
      },
    });
  });

  it('debe registrar la compra como movimiento y actualizar el saldo', async () => {
    const tx = {
      client: {
        update: jest.fn().mockResolvedValue({ walletBalance: '-21490' }),
      },
      transaction: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as never;

    await service.recordPurchaseTransaction(tx, {
      clientId: 10,
      amount: 21490,
      purchaseId: 15,
    });

    expect((tx as any).client.update).toHaveBeenCalledWith({
      where: { clientId: 10 },
      data: { walletBalance: { decrement: 21490 } },
      select: { walletBalance: true },
    });
    expect((tx as any).transaction.create).toHaveBeenCalledWith({
      data: {
        clientId: 10,
        purchaseId: 15,
        refundId: null,
        transactionType: TransactionType.payment,
        amount: 21490,
        balanceAfter: '-21490',
        gatewayReference: null,
      },
    });
  });

  it('debe filtrar el historial de transacciones', async () => {
    prisma.transaction.count.mockResolvedValue(1);
    prisma.transaction.findMany.mockResolvedValue([
      {
        transactionId: 1,
        transactionType: TransactionType.payment,
        amount: '1000',
        balanceAfter: '9000',
        transactionDate: new Date('2026-05-10T10:00:00.000Z'),
        purchaseId: 3,
        refundId: null,
        gatewayReference: null,
      },
    ]);

    const result = await service.getWalletTransactions(10, {
      page: 2,
      limit: 10,
      type: TransactionType.payment,
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-31T23:59:59.999Z',
    });

    expect(prisma.transaction.count).toHaveBeenCalledWith({
      where: {
        clientId: 10,
        transactionType: TransactionType.payment,
        transactionDate: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
    });
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(1);
  });

  it('debe rechazar rangos de fecha invertidos', async () => {
    await expect(
      service.getWalletTransactions(10, {
        page: 1,
        limit: 20,
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-05-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe fallar si el cliente no existe', async () => {
    prisma.client.findUnique.mockResolvedValue(null);

    await expect(service.getWallet(10)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});