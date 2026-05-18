import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryMode, PurchaseStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { StoresService } from '../stores/stores.service';
import { PurchasesService } from './purchases.service';
import { WalletService } from '../wallet/wallet.service';

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
  let storesService: {
    findActiveById: jest.Mock;
  };
  let walletService: {
    recordPurchaseTransaction: jest.Mock;
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
    estimatedDeliveryTime:
      'Entrega estimada entre 16/4/2026 y 18/4/2026 para Av. Corrientes 1234, Buenos Aires',
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

    storesService = {
      findActiveById: jest.fn(),
    };

    walletService = {
      recordPurchaseTransaction: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: StoresService,
          useValue: storesService,
        },
        {
          provide: WalletService,
          useValue: walletService,
        },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createPurchase', () => {
    it('debe crear la compra, descontar inventario y marcar el carrito como procesado', async () => {
      const cart = {
        cartId: 1,
        clientId: 10,
        status: 'active',
        cartItems: [
          {
            bookId: 5,
            quantity: 1,
            unitPrice: '21490',
            book: {
              bookId: 5,
              title: 'El Quijote',
              author: 'Miguel de Cervantes',
            },
          },
        ],
      };

      const createdPurchase = {
        purchaseId: 15,
        clientId: 10,
        purchaseDate: new Date('2026-04-14T12:00:00.000Z'),
        totalAmount: '21490',
        paymentMethod: 'Tarjeta de credito',
        shippingAddress: 'Av. Corrientes 1234, Buenos Aires',
        deliveryMode: DeliveryMode.homeDelivery,
        pickupStoreId: null,
        estimatedDeliveryTime:
          'Entrega estimada entre 16/4/2026 y 18/4/2026 para Av. Corrientes 1234, Buenos Aires',
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
            quantity: 1,
            unitPrice: '21490',
            book: {
              title: 'El Quijote',
              author: 'Miguel de Cervantes',
            },
          },
        ],
      };

      const tx = {
        book: {
          findMany: jest.fn().mockResolvedValue([
            {
              bookId: 5,
              title: 'El Quijote',
              isAvailable: true,
            },
          ]),
        },
        inventory: {
          findMany: jest.fn().mockResolvedValue([
            {
              inventoryId: 11,
              bookId: 5,
              storeId: 1,
              availableQuantity: 2,
            },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
        reservationItem: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({}),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          count: jest.fn().mockResolvedValue(0),
        },
        purchase: {
          create: jest.fn().mockResolvedValue(createdPurchase),
        },
        cart: {
          update: jest.fn().mockResolvedValue({}),
        },
        cartItem: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      prisma.cart.findUnique.mockResolvedValueOnce(cart);
      prisma.$transaction.mockImplementation(async (callback: any) =>
        callback(tx),
      );

      const result = await service.createPurchase(10, {
        deliveryMode: DeliveryMode.homeDelivery,
        shippingAddress: 'Av. Corrientes 1234, Buenos Aires',
        paymentMethod: 'Tarjeta de credito',
      });

      expect(tx.book.findMany).toHaveBeenCalledWith({
        where: { bookId: { in: [5] } },
        select: {
          bookId: true,
          title: true,
          isAvailable: true,
        },
      });
      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { inventoryId: 11 },
        data: {
          availableQuantity: { decrement: 1 },
        },
      });
      expect(tx.cart.update).toHaveBeenCalledWith({
        where: { cartId: 1 },
        data: { status: 'processed' },
      });
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 1 },
      });
      expect(walletService.recordPurchaseTransaction).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          clientId: 10,
          amount: 21490,
          purchaseId: 15,
        }),
      );
      expect(mailService.sendPurchaseInvoice).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(PurchaseStatus.inPreparation);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].bookId).toBe(5);
    });

    it('debe crear compra con retiro en tienda usando stock de la tienda elegida', async () => {
      const cart = {
        cartId: 1,
        clientId: 10,
        status: 'active',
        cartItems: [
          {
            bookId: 5,
            quantity: 1,
            unitPrice: '21490',
            book: {
              bookId: 5,
              title: 'El Quijote',
              author: 'Miguel de Cervantes',
            },
          },
        ],
      };

      const createdPurchase = {
        ...basePurchase,
        deliveryMode: DeliveryMode.storePickup,
        pickupStoreId: 2,
        pickupStore: { name: 'Sucursal Centro' },
      };

      storesService.findActiveById.mockResolvedValueOnce({
        storeId: 2,
        name: 'Sucursal Centro',
        city: 'Bogota',
        latitude: null,
        longitude: null,
      });

      const tx = {
        book: {
          findMany: jest.fn().mockResolvedValue([
            {
              bookId: 5,
              title: 'El Quijote',
              isAvailable: true,
            },
          ]),
        },
        inventory: {
          findMany: jest.fn().mockResolvedValue([
            {
              inventoryId: 11,
              bookId: 5,
              storeId: 2,
              availableQuantity: 2,
            },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
        reservationItem: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({}),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          count: jest.fn().mockResolvedValue(0),
        },
        purchase: {
          create: jest.fn().mockResolvedValue(createdPurchase),
        },
        cart: {
          update: jest.fn().mockResolvedValue({}),
        },
        cartItem: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      prisma.cart.findUnique.mockResolvedValueOnce(cart);
      prisma.$transaction.mockImplementation(async (callback: any) =>
        callback(tx),
      );

      const result = await service.createPurchase(10, {
        deliveryMode: DeliveryMode.storePickup,
        pickupStoreId: 2,
        paymentMethod: 'Tarjeta de credito',
      });

      expect(storesService.findActiveById).toHaveBeenCalledWith(2);
      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: { inventoryId: 11 },
        data: {
          availableQuantity: { decrement: 1 },
        },
      });
      expect(result.deliveryMode).toBe(DeliveryMode.storePickup);
      expect(result.pickupStoreId).toBe(2);
    });

    it('debe usar inventario reservado del cliente y no decrementar stock disponible otra vez', async () => {
      const cart = {
        cartId: 1,
        clientId: 10,
        status: 'active',
        cartItems: [
          {
            bookId: 5,
            quantity: 1,
            unitPrice: '21490',
            book: {
              bookId: 5,
              title: 'El Quijote',
              author: 'Miguel de Cervantes',
            },
          },
        ],
      };

      const createdPurchase = {
        ...basePurchase,
        purchaseItems: [
          {
            purchaseItemId: 1,
            bookId: 5,
            quantity: 1,
            unitPrice: '21490',
            book: {
              title: 'El Quijote',
              author: 'Miguel de Cervantes',
            },
          },
        ],
      };

      const tx = {
        book: {
          findMany: jest.fn().mockResolvedValue([
            {
              bookId: 5,
              title: 'El Quijote',
              isAvailable: true,
            },
          ]),
        },
        inventory: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({}),
        },
        reservationItem: {
          findMany: jest.fn().mockResolvedValue([
            {
              reservationItemId: 70,
              reservationId: 11,
              bookId: 5,
              storeId: 1,
              quantity: 1,
            },
          ]),
          update: jest.fn().mockResolvedValue({}),
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          count: jest.fn().mockResolvedValue(0),
        },
        purchase: {
          create: jest.fn().mockResolvedValue(createdPurchase),
        },
        cart: {
          update: jest.fn().mockResolvedValue({}),
        },
        cartItem: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        reservation: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      prisma.cart.findUnique.mockResolvedValueOnce(cart);
      prisma.$transaction.mockImplementation(async (callback: any) =>
        callback(tx),
      );

      const result = await service.createPurchase(10, {
        deliveryMode: DeliveryMode.homeDelivery,
        shippingAddress: 'Av. Corrientes 1234, Buenos Aires',
        paymentMethod: 'Tarjeta de credito',
      });

      expect(tx.reservationItem.findMany).toHaveBeenCalled();
      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: {
          bookId_storeId: {
            bookId: 5,
            storeId: 1,
          },
        },
        data: { reservedQuantity: { decrement: 1 } },
      });
      expect(tx.inventory.update).not.toHaveBeenCalledWith({
        where: { inventoryId: expect.any(Number) },
        data: { availableQuantity: expect.any(Object) },
      });
      expect(tx.reservationItem.deleteMany).toHaveBeenCalledWith({
        where: { reservationItemId: { in: [70] } },
      });
      expect(tx.reservation.update).toHaveBeenCalledWith({
        where: { reservationId: 11 },
        data: { status: 'converted' },
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].bookId).toBe(5);
    });

    it('debe rechazar la compra si el stock es insuficiente', async () => {
      const cart = {
        cartId: 1,
        clientId: 10,
        status: 'active',
        cartItems: [
          {
            bookId: 5,
            quantity: 2,
            unitPrice: '21490',
            book: {
              bookId: 5,
              title: 'El Quijote',
              author: 'Miguel de Cervantes',
            },
          },
        ],
      };

      const tx = {
        book: {
          findMany: jest.fn().mockResolvedValue([
            {
              bookId: 5,
              title: 'El Quijote',
              isAvailable: true,
            },
          ]),
        },
        inventory: {
          findMany: jest.fn().mockResolvedValue([
            {
              inventoryId: 11,
              bookId: 5,
              storeId: 1,
              availableQuantity: 1,
            },
          ]),
          update: jest.fn(),
        },
        reservationItem: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({}),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          count: jest.fn().mockResolvedValue(0),
        },
        purchase: {
          create: jest.fn(),
        },
        cart: {
          update: jest.fn(),
        },
        cartItem: {
          deleteMany: jest.fn(),
        },
      };

      prisma.cart.findUnique.mockResolvedValueOnce(cart);
      prisma.$transaction.mockImplementation(async (callback: any) =>
        callback(tx),
      );

      await expect(
        service.createPurchase(10, {
          deliveryMode: DeliveryMode.homeDelivery,
          shippingAddress: 'Av. Corrientes 1234, Buenos Aires',
          paymentMethod: 'Tarjeta de credito',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(tx.purchase.create).not.toHaveBeenCalled();
      expect(tx.cart.update).not.toHaveBeenCalled();
      expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
    });
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
    expect(result.estimatedDeliveryTime).toContain(
      'Av. Santa Fe 4321, Buenos Aires',
    );
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
