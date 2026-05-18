import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PurchaseStatus, ReturnStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ReturnsService } from './returns.service';
import * as QRCode from 'qrcode';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('ReturnsService', () => {
  let service: ReturnsService;
  let prisma: {
    purchase: {
      findUnique: jest.Mock;
    };
    returnBook: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let mailService: {
    sendReturnApprovedEmail: jest.Mock;
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-16T12:00:00.000Z'));

    prisma = {
      purchase: {
        findUnique: jest.fn(),
      },
      returnBook: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mailService = {
      sendReturnApprovedEmail: jest.fn().mockResolvedValue(undefined),
    };

    (QRCode.toDataURL as jest.Mock).mockResolvedValue(
      'data:image/png;base64,ZmFrZS1xci1kYXRh',
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'RETURN_REQUEST_MAX_DAYS' ? '30' : undefined,
            ),
          },
        },
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debe crear solicitud de devolucion en estado pending', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce({
      purchaseId: 15,
      clientId: 10,
      status: PurchaseStatus.delivered,
      purchaseDate: new Date('2026-05-01T10:00:00.000Z'),
      dispatchDate: new Date('2026-05-03T10:00:00.000Z'),
      returnBook: null,
    });

    prisma.returnBook.create.mockResolvedValueOnce({
      returnBookId: 4,
      purchaseId: 15,
      clientId: 10,
      reason: 'badCondition',
      additionalDescription: 'Golpes en la portada',
      requestDate: new Date('2026-05-16T12:00:00.000Z'),
      status: ReturnStatus.pending,
      qrCodeUrl: null,
      approvalDate: null,
    });

    const result = await service.createReturnRequest(10, {
      purchaseId: 15,
      reason: 'badCondition',
      additionalDescription: '  Golpes en la portada  ',
    } as any);

    expect(prisma.returnBook.create).toHaveBeenCalledWith({
      data: {
        purchaseId: 15,
        clientId: 10,
        reason: 'badCondition',
        additionalDescription: 'Golpes en la portada',
        status: ReturnStatus.pending,
      },
    });
    expect(result.status).toBe(ReturnStatus.pending);
  });

  it('debe rechazar cuando la compra no existe', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.createReturnRequest(10, {
        purchaseId: 999,
        reason: 'badCondition',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('debe rechazar cuando la compra no pertenece al cliente', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce({
      purchaseId: 15,
      clientId: 11,
      status: PurchaseStatus.delivered,
      purchaseDate: new Date('2026-05-01T10:00:00.000Z'),
      dispatchDate: new Date('2026-05-03T10:00:00.000Z'),
      returnBook: null,
    });

    await expect(
      service.createReturnRequest(10, {
        purchaseId: 15,
        reason: 'badCondition',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('debe rechazar cuando la compra no esta delivered', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce({
      purchaseId: 15,
      clientId: 10,
      status: PurchaseStatus.shipped,
      purchaseDate: new Date('2026-05-01T10:00:00.000Z'),
      dispatchDate: new Date('2026-05-03T10:00:00.000Z'),
      returnBook: null,
    });

    await expect(
      service.createReturnRequest(10, {
        purchaseId: 15,
        reason: 'badCondition',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe rechazar cuando ya existe devolucion para la compra', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce({
      purchaseId: 15,
      clientId: 10,
      status: PurchaseStatus.delivered,
      purchaseDate: new Date('2026-05-01T10:00:00.000Z'),
      dispatchDate: new Date('2026-05-03T10:00:00.000Z'),
      returnBook: { returnBookId: 2 },
    });

    await expect(
      service.createReturnRequest(10, {
        purchaseId: 15,
        reason: 'badCondition',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe rechazar cuando vence el plazo de devolucion', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce({
      purchaseId: 15,
      clientId: 10,
      status: PurchaseStatus.delivered,
      purchaseDate: new Date('2026-03-01T10:00:00.000Z'),
      dispatchDate: null,
      returnBook: null,
    });

    await expect(
      service.createReturnRequest(10, {
        purchaseId: 15,
        reason: 'lateDelivery',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe listar solicitudes pendientes para administracion', async () => {
    prisma.returnBook.findMany.mockResolvedValueOnce([
      {
        returnBookId: 4,
        purchaseId: 15,
        clientId: 10,
        reason: 'badCondition',
        additionalDescription: 'Portada rota',
        requestDate: new Date('2026-05-16T10:00:00.000Z'),
        status: ReturnStatus.pending,
        approvalDate: null,
        qrCodeUrl: null,
        client: {
          user: {
            firstName: 'Ana',
            lastName: 'Perez',
            email: 'ana@example.com',
          },
        },
        purchase: {
          purchaseDate: new Date('2026-05-10T10:00:00.000Z'),
          totalAmount: '54990',
          purchaseItems: [
            {
              purchaseItemId: 1,
              bookId: 2,
              quantity: 1,
              book: {
                title: 'Libro A',
                author: 'Autor A',
                coverUrl: 'data:image/png;base64,abc',
                previewUrl: null,
              },
            },
          ],
        },
      },
    ]);

    const result = await service.getPendingReturnRequests();

    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe('Ana Perez');
    expect(result[0].reasonLabel).toBe('Producto en mal estado');
    expect(result[0].items).toHaveLength(1);
  });

  it('debe aprobar solicitud, guardar QR base64 y enviar correo', async () => {
    prisma.returnBook.findUnique.mockResolvedValueOnce({
      returnBookId: 4,
      purchaseId: 15,
      clientId: 10,
      reason: 'lateDelivery',
      additionalDescription: 'Llego tarde',
      status: ReturnStatus.pending,
      client: {
        user: {
          email: 'ana@example.com',
          firstName: 'Ana',
        },
      },
    });

    prisma.returnBook.update.mockResolvedValueOnce({
      returnBookId: 4,
      purchaseId: 15,
      clientId: 10,
      reason: 'lateDelivery',
      additionalDescription: 'Llego tarde',
      requestDate: new Date('2026-05-16T10:00:00.000Z'),
      status: ReturnStatus.approved,
      qrCodeUrl: 'data:image/png;base64,ZmFrZS1xci1kYXRh',
      approvalDate: new Date('2026-05-16T12:00:00.000Z'),
    });

    const result = await service.approveReturnRequest(4);

    expect(QRCode.toDataURL).toHaveBeenCalled();
    expect(prisma.returnBook.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { returnBookId: 4 },
        data: expect.objectContaining({
          status: ReturnStatus.approved,
          qrCodeUrl: 'data:image/png;base64,ZmFrZS1xci1kYXRh',
        }),
      }),
    );
    expect(mailService.sendReturnApprovedEmail).toHaveBeenCalledWith(
      'ana@example.com',
      expect.objectContaining({
        returnBookId: 4,
        purchaseId: 15,
        reasonLabel: 'Entrega fuera de tiempo',
        qrCodeDataUrl: 'data:image/png;base64,ZmFrZS1xci1kYXRh',
      }),
    );
    expect(result.status).toBe(ReturnStatus.approved);
  });
});
