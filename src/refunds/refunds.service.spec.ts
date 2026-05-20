import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RefundStatus, ReturnStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { RefundsService } from './refunds.service';

describe('RefundsService', () => {
  let service: RefundsService;
  let prisma: {
    returnBook: {
      findUnique: jest.Mock;
    };
    refund: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let walletService: {
    recordRefundTransaction: jest.Mock;
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));

    prisma = {
      returnBook: {
        findUnique: jest.fn(),
      },
      refund: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    walletService = {
      recordRefundTransaction: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
          },
        },
        {
          provide: WalletService,
          useValue: walletService,
        },
      ],
    }).compile();

    service = module.get(RefundsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('crea un reembolso pendiente cuando la devolucion esta aprobada y esta dentro del plazo', async () => {
    prisma.returnBook.findUnique.mockResolvedValueOnce({
      returnBookId: 9,
      clientId: 10,
      status: ReturnStatus.approved,
      refund: null,
      purchase: {
        purchaseId: 15,
        clientId: 10,
        purchaseDate: new Date('2026-05-18T12:00:00.000Z'),
        totalAmount: '54990',
        paymentMethod: 'Tarjeta de credito',
      },
    });
    prisma.refund.create.mockResolvedValueOnce({
      refundId: 12,
      returnId: 9,
      purchaseId: 15,
      amount: '54990',
      refundMethod: null,
      requestDate: new Date('2026-05-20T12:00:00.000Z'),
      status: RefundStatus.pending,
    });

    const result = await service.createRefundRequest(10, { returnBookId: 9 });

    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: {
        returnId: 9,
        purchaseId: 15,
        amount: 54990,
        status: RefundStatus.pending,
      },
    });
    expect(result.status).toBe(RefundStatus.pending);
  });

  it('rechaza si la devolucion no esta aprobada', async () => {
    prisma.returnBook.findUnique.mockResolvedValueOnce({
      returnBookId: 9,
      clientId: 10,
      status: ReturnStatus.pending,
      refund: null,
      purchase: {
        purchaseId: 15,
        clientId: 10,
        purchaseDate: new Date('2026-05-18T12:00:00.000Z'),
        totalAmount: '54990',
        paymentMethod: 'Tarjeta de credito',
      },
    });

    await expect(
      service.createRefundRequest(10, { returnBookId: 9 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si el plazo de 7 dias vencio', async () => {
    prisma.returnBook.findUnique.mockResolvedValueOnce({
      returnBookId: 9,
      clientId: 10,
      status: ReturnStatus.approved,
      refund: null,
      purchase: {
        purchaseId: 15,
        clientId: 10,
        purchaseDate: new Date('2026-05-01T12:00:00.000Z'),
        totalAmount: '54990',
        paymentMethod: 'Tarjeta de credito',
      },
    });

    await expect(
      service.createRefundRequest(10, { returnBookId: 9 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('procesa un reembolso pendiente y registra el movimiento en el monedero', async () => {
    prisma.refund.findUnique.mockResolvedValueOnce({
      refundId: 12,
      returnId: 9,
      purchaseId: 15,
      amount: '54990',
      refundMethod: null,
      requestDate: new Date('2026-05-20T12:00:00.000Z'),
      status: RefundStatus.pending,
      purchase: {
        purchaseId: 15,
        clientId: 10,
        paymentMethod: 'Tarjeta de credito',
      },
      returnBook: {
        returnBookId: 9,
        status: ReturnStatus.approved,
      },
    });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({
        refund: {
          update: jest.fn().mockResolvedValue({
            refundId: 12,
            returnId: 9,
            purchaseId: 15,
            amount: '54990',
            refundMethod: 'Tarjeta de credito',
            requestDate: new Date('2026-05-20T12:00:00.000Z'),
            status: RefundStatus.processed,
          }),
        },
      }),
    );

    const result = await service.processRefund(12);

    expect(walletService.recordRefundTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        clientId: 10,
        amount: 54990,
        refundId: 12,
        gatewayReference: 'Tarjeta de credito',
      }),
    );
    expect(result.status).toBe(RefundStatus.processed);
  });

  it('rechaza si el reembolso no pertenece al cliente', async () => {
    prisma.returnBook.findUnique.mockResolvedValueOnce({
      returnBookId: 9,
      clientId: 11,
      status: ReturnStatus.approved,
      refund: null,
      purchase: {
        purchaseId: 15,
        clientId: 11,
        purchaseDate: new Date('2026-05-18T12:00:00.000Z'),
        totalAmount: '54990',
        paymentMethod: 'Tarjeta de credito',
      },
    });

    await expect(
      service.createRefundRequest(10, { returnBookId: 9 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});