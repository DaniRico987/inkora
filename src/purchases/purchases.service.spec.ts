import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PurchasesService } from './purchases.service';

describe('PurchasesService', () => {
  let service: PurchasesService;
  let prisma: {
    purchase: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    cart: {
      findUnique: jest.Mock;
    };
    store: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mailService: {
    sendPurchaseInvoice: jest.Mock;
  };

  const basePurchase = {
    purchaseId: 15,
    clientId: 10,
    purchaseDate: new Date('2026-04-14T12:00:00.000Z'),
    totalAmount: '42980',
    paymentMethod: 'Tarjeta de credito',
    shippingAddress: 'Av. Corrientes 1234, Buenos Aires',
    deliveryMode: 'homeDelivery' as const,
    pickupStoreId: null,
    estimatedDeliveryTime: 'Entrega estimada entre 16/4/2026 y 18/4/2026 para Av. Corrientes 1234, Buenos Aires',
    dispatchDate: null,
    status: PurchaseStatus.inPreparation,
    client: {
      user: {
        email: 'client@inkora.com',
        firstName: 'Ana',
      },
    },
    pickupStore: null,
    purchaseItems: [
      {
        purchaseItemId: 1,
        bookId: 5,
        quantity: 2,
        unitPrice: '21490',
        book: {
          title: 'El Quijote',
          author: 'Miguel de Cervantes',
        },
      },
    ],
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-14T12:00:00.000Z'));

    prisma = {
      purchase: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      cart: {
        findUnique: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mailService = {
      sendPurchaseInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: MailService,
          useValue: mailService,
        },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debe actualizar la direccion y recalcular el ETA si el pedido esta en preparacion', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce(basePurchase);
    prisma.purchase.update.mockResolvedValueOnce({
      ...basePurchase,
      shippingAddress: 'Av. Santa Fe 4321, Buenos Aires',
      estimatedDeliveryTime:
        'Entrega estimada entre 16/4/2026 y 18/4/2026 para Av. Santa Fe 4321, Buenos Aires',
    });

    const result = await service.updatePurchaseAddress(
      15,
      10,
      'Av. Santa Fe 4321, Buenos Aires',
    );

    expect(prisma.purchase.update).toHaveBeenCalledWith({
      where: { purchaseId: 15 },
      data: {
        shippingAddress: 'Av. Santa Fe 4321, Buenos Aires',
        estimatedDeliveryTime:
          'Entrega estimada entre 16/4/2026 y 18/4/2026 para Av. Santa Fe 4321, Buenos Aires',
      },
      include: {
        purchaseItems: {
          include: {
            book: {
              select: {
                title: true,
                author: true,
              },
            },
          },
        },
      },
    });
    expect(result.shippingAddress).toBe('Av. Santa Fe 4321, Buenos Aires');
    expect(result.estimatedDeliveryTime).toContain('Av. Santa Fe 4321, Buenos Aires');
  });

  it('debe lanzar forbidden si el pedido no pertenece al cliente', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce({
      ...basePurchase,
      clientId: 99,
    });

    await expect(
      service.updatePurchaseAddress(15, 10, 'Nueva direccion'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe lanzar bad request si el pedido ya fue despachado', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce({
      ...basePurchase,
      status: PurchaseStatus.shipped,
    });

    await expect(
      service.updatePurchaseAddress(15, 10, 'Nueva direccion'),
    ).rejects.toThrow(
      'El pedido ya fue despachado. Solo los pedidos en preparacion permiten cambiar la direccion de entrega.',
    );
  });

  it('debe lanzar not found si la compra no existe', async () => {
    prisma.purchase.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.updatePurchaseAddress(15, 10, 'Nueva direccion'),
    ).rejects.toThrow(NotFoundException);
  });
});
