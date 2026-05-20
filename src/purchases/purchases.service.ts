import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryMode, Prisma, PurchaseStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';
import {
  StoresService,
  type StoreReferenceDto,
} from '../stores/stores.service';
import { WalletService } from '../wallet/wallet.service';

type PurchaseCartItem = {
  bookId: number;
  quantity: number;
  unitPrice: unknown;
  book: {
    bookId: number;
    title: string;
    author: string;
  };
};

type PurchaseBookInventory = {
  inventoryId: number;
  bookId: number;
  storeId: number;
  availableQuantity: number;
};

type PurchaseBookAvailability = {
  bookId: number;
  title: string;
  isAvailable: boolean;
};

type StoreInventoryView = {
  inventoryId: number;
  bookId: number;
  storeId: number;
  availableQuantity: number;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

type PurchaseDetails = {
  purchaseId: number;
  clientId: number;
  purchaseDate: Date;
  totalAmount: unknown;
  paymentMethod: string | null;
  shippingAddress: string | null;
  deliveryMode: DeliveryMode | null;
  pickupStoreId: number | null;
  estimatedDeliveryTime: string | null;
  dispatchDate: Date | null;
  status: PurchaseStatus;
  client: { user: { email: string; firstName: string } };
  pickupStore: { name: string } | null;
  purchaseItems: Array<{
    purchaseItemId: number;
    bookId: number;
    quantity: number;
    unitPrice: unknown;
    book: {
      title: string;
      author: string;
    };
  }>;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  return Number.parseFloat(String(value));
};

const MAX_COPIES_PER_BOOK_PURCHASE = 3;

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly storesService: StoresService,
    private readonly walletService: WalletService,
  ) {}

  async createPurchase(
    clientId: number,
    dto: CreatePurchaseDto,
  ): Promise<PurchaseResponseDto> {
    if (dto.deliveryMode === DeliveryMode.storePickup && !dto.pickupStoreId) {
      throw new BadRequestException(
        'pickupStoreId es obligatorio cuando deliveryMode es storePickup',
      );
    }

    if (dto.currency && dto.currency !== 'COP') {
      throw new BadRequestException('Solo se acepta la moneda COP');
    }

    if (
      dto.deliveryMode === DeliveryMode.homeDelivery &&
      !dto.shippingAddress
    ) {
      throw new BadRequestException(
        'shippingAddress es obligatorio cuando deliveryMode es homeDelivery',
      );
    }

    const cart = await this.prisma.cart.findUnique({
      where: { clientId },
      include: {
        cartItems: {
          include: {
            book: {
              select: {
                bookId: true,
                title: true,
                author: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new BadRequestException(
        'El carrito no tiene items para confirmar compra',
      );
    }

    if (cart.status !== 'active') {
      throw new BadRequestException('El carrito ya fue procesado');
    }

    const cartItems = cart.cartItems as PurchaseCartItem[];
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + item.quantity * toNumber(item.unitPrice);
    }, 0);

    const requestedItems = this.groupCartItemsByBook(cartItems);
    let pickupStoreName: string | undefined;

    const purchase = await this.prisma.$transaction(
      async (tx): Promise<PurchaseDetails> => {
        pickupStoreName = await this.validatePurchaseInventory(
          tx,
          clientId,
          cartItems,
          dto.deliveryMode,
          dto.pickupStoreId,
        );

        const reservedConsumption = await this.consumeReservedInventoryForPurchase(
          tx,
          clientId,
          requestedItems,
          dto.pickupStoreId,
        );

        const estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(
          dto.deliveryMode,
          pickupStoreName,
        );

        // Apply voucher if provided
        let finalTotal = totalAmount;
        let appliedVoucherId: number | null = null;
        if (dto.voucherCode) {
          const clientInfo = await tx.client.findUnique({ where: { clientId }, select: { userId: true } });
          const voucher = await tx.voucher.findUnique({ where: { code: dto.voucherCode } });
          if (!voucher) {
            throw new BadRequestException('Voucher invalido');
          }
          if (voucher.userId !== clientInfo?.userId) {
            throw new BadRequestException('Voucher no pertenece a este cliente');
          }
          if (voucher.isUsed) {
            throw new BadRequestException('Voucher ya fue usado');
          }
          const nowUtc = new Date();
          if (voucher.expiresAt < nowUtc) {
            throw new BadRequestException('Voucher expirado');
          }

          const discount = (Number(voucher.discountPercentage) / 100) * finalTotal;
          finalTotal = finalTotal - discount;
          appliedVoucherId = voucher.id;
        }

        const createdPurchase = await tx.purchase.create({
          data: {
            clientId,
            totalAmount: finalTotal,
            paymentMethod: dto.paymentMethod,
            shippingAddress: dto.shippingAddress,
            deliveryMode: dto.deliveryMode,
            pickupStoreId:
              dto.deliveryMode === DeliveryMode.storePickup
                ? dto.pickupStoreId
                : null,
            estimatedDeliveryTime,
            status: PurchaseStatus.inPreparation,
            purchaseItems: {
              create: cartItems.map((item) => ({
                book: {
                  connect: {
                    bookId: item.bookId,
                  },
                },
                quantity: item.quantity,
                unitPrice: toNumber(item.unitPrice),
              })),
            },
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
            client: {
              include: {
                user: {
                  select: {
                    email: true,
                    firstName: true,
                  },
                },
              },
            },
            pickupStore: {
              select: {
                name: true,
              },
            },
          },
        });

        const remainingPurchaseItems = new Map<number, number>();
        for (const [bookId, quantity] of requestedItems.entries()) {
          const reservedUsed = reservedConsumption.get(bookId) ?? 0;
          const remaining = Math.max(0, quantity - reservedUsed);
          if (remaining > 0) {
            remainingPurchaseItems.set(bookId, remaining);
          }
        }

        if (remainingPurchaseItems.size > 0) {
          const requestedBookIds = [...remainingPurchaseItems.keys()];
          const decrementInventories = await tx.inventory.findMany({
            where: {
              bookId: { in: requestedBookIds },
              availableQuantity: { gt: 0 },
              ...(dto.deliveryMode === DeliveryMode.storePickup
                ? { storeId: dto.pickupStoreId }
                : {}),
            },
            select: {
              inventoryId: true,
              bookId: true,
              storeId: true,
              availableQuantity: true,
            },
            orderBy: [{ bookId: 'asc' }, { storeId: 'asc' }],
          });

          for (const [bookId, remaining] of remainingPurchaseItems.entries()) {
            const bookInventories = decrementInventories.filter(
              (inventory) => inventory.bookId === bookId,
            );
            await this.decrementInventoryForPurchase(tx, bookInventories, remaining);
          }
        }

        await this.walletService.recordPurchaseTransaction(tx, {
          clientId,
          amount: finalTotal,
          purchaseId: createdPurchase.purchaseId,
          gatewayReference: dto.paymentMethod ?? null,
        });

        await tx.cart.update({
          where: { cartId: cart.cartId },
          data: { status: 'processed' },
        });

        // mark voucher as used if applied (with audit fields)
        if (appliedVoucherId) {
          await tx.voucher.update({
            where: { id: appliedVoucherId },
            data: { isUsed: true, usedAt: new Date(), appliedToPurchaseId: createdPurchase.purchaseId },
          });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });

        return createdPurchase;
      },
    );

    this.sendInvoiceEmail(purchase).catch((error) => {
      this.logger.error(
        `No se pudo enviar factura de compra ${purchase.purchaseId}: ${String(error)}`,
      );
    });

    return this.mapPurchaseResponse(purchase);
  }

  async getPurchaseById(
    purchaseId: number,
    user: AuthenticatedUser,
  ): Promise<PurchaseResponseDto> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { purchaseId },
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
        returnBook: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException(`Compra con ID ${purchaseId} no encontrada`);
    }

    const isPrivileged = user.userType === 'admin';
    if (!isPrivileged) {
      if (!user.clientId) {
        throw new ForbiddenException('No tienes permiso para ver esta compra');
      }

      if (purchase.clientId !== user.clientId) {
        throw new ForbiddenException('No tienes permiso para ver esta compra');
      }
    }

    return this.mapPurchaseResponse(purchase);
  }

  async updatePurchaseAddress(
    purchaseId: number,
    clientId: number,
    shippingAddress: string,
  ): Promise<PurchaseResponseDto> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { purchaseId },
      include: {
        client: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
              },
            },
          },
        },
        pickupStore: {
          select: {
            name: true,
          },
        },
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

    if (!purchase) {
      throw new NotFoundException(`Compra con ID ${purchaseId} no encontrada`);
    }

    if (purchase.clientId !== clientId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta compra',
      );
    }

    if (purchase.status !== PurchaseStatus.inPreparation) {
      throw new BadRequestException(
        'El pedido ya fue despachado. Solo los pedidos en preparacion permiten cambiar la direccion de entrega.',
      );
    }

    const nextEstimatedDeliveryTime = this.calculateEstimatedDeliveryTime(
      purchase.deliveryMode ?? DeliveryMode.homeDelivery,
      purchase.pickupStore?.name,
      shippingAddress,
    );

    const updated = await this.prisma.purchase.update({
      where: { purchaseId },
      data: {
        shippingAddress,
        estimatedDeliveryTime: nextEstimatedDeliveryTime,
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

    return this.mapPurchaseResponse(updated);
  }

  async updatePurchaseStatus(
    purchaseId: number,
    status: PurchaseStatus,
  ): Promise<PurchaseResponseDto> {
    const current = await this.prisma.purchase.findUnique({
      where: { purchaseId },
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

    if (!current) {
      throw new NotFoundException(`Compra con ID ${purchaseId} no encontrada`);
    }

    if (current.status === status) {
      return this.mapPurchaseResponse(current);
    }

    if (!this.isAllowedTransition(current.status, status)) {
      throw new BadRequestException(
        `No se permite cambiar estado de ${current.status} a ${status}`,
      );
    }

    const updated = await this.prisma.purchase.update({
      where: { purchaseId },
      data: {
        status,
        dispatchDate:
          status === PurchaseStatus.shipped
            ? current.dispatchDate || new Date()
            : current.dispatchDate,
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

    return this.mapPurchaseResponse(updated);
  }

  private isAllowedTransition(
    from: PurchaseStatus,
    to: PurchaseStatus,
  ): boolean {
    const allowed: Record<PurchaseStatus, PurchaseStatus[]> = {
      [PurchaseStatus.inPreparation]: [
        PurchaseStatus.shipped,
        PurchaseStatus.cancelled,
      ],
      [PurchaseStatus.shipped]: [PurchaseStatus.delivered],
      [PurchaseStatus.delivered]: [],
      [PurchaseStatus.cancelled]: [],
    };

    return allowed[from].includes(to);
  }

  private calculateEstimatedDeliveryTime(
    deliveryMode: DeliveryMode,
    pickupStoreName?: string,
    shippingAddress?: string,
  ): string {
    const now = new Date();

    if (deliveryMode === DeliveryMode.storePickup) {
      const readyDate = new Date(now);
      readyDate.setDate(readyDate.getDate() + 1);
      const formattedDate = readyDate.toLocaleDateString('es-AR');
      const safeStoreName = pickupStoreName || 'tienda seleccionada';
      return `Retiro disponible desde ${formattedDate} en ${safeStoreName}`;
    }

    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() + 2);
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 4);

    const destinationSuffix =
      deliveryMode === DeliveryMode.homeDelivery && shippingAddress?.trim()
        ? ` para ${shippingAddress.trim()}`
        : '';

    return `Entrega estimada entre ${minDate.toLocaleDateString('es-AR')} y ${maxDate.toLocaleDateString('es-AR')}${destinationSuffix}`;
  }

  private mapPurchaseResponse(purchase: {
    purchaseId: number;
    clientId: number;
    purchaseDate: Date;
    totalAmount: unknown;
    paymentMethod: string | null;
    shippingAddress: string | null;
    deliveryMode: DeliveryMode | null;
    pickupStoreId: number | null;
    estimatedDeliveryTime: string | null;
    dispatchDate: Date | null;
    status: PurchaseStatus;
    purchaseItems: Array<{
      purchaseItemId: number;
      bookId: number;
      quantity: number;
      unitPrice: unknown;
      book: {
        title: string;
        author: string;
      };
    }>;
    returnBook?: {
      returnBookId: number;
      purchaseId: number;
      clientId: number;
      reason?: string | null;
      additionalDescription?: string | null;
      requestDate: Date;
      status: any;
      qrCodeUrl?: string | null;
      approvalDate?: Date | null;
      adminNote?: string | null;
      decisionDate?: Date | null;
    } | null;
  }): PurchaseResponseDto {
    return {
      purchaseId: purchase.purchaseId,
      clientId: purchase.clientId,
      purchaseDate: purchase.purchaseDate,
      totalAmount: toNumber(purchase.totalAmount),
      paymentMethod: purchase.paymentMethod,
      shippingAddress: purchase.shippingAddress,
      deliveryMode: purchase.deliveryMode,
      pickupStoreId: purchase.pickupStoreId,
      estimatedDeliveryTime: purchase.estimatedDeliveryTime,
      dispatchDate: purchase.dispatchDate,
      status: purchase.status,
      items: purchase.purchaseItems.map((item) => {
        const unitPrice = toNumber(item.unitPrice);
        return {
          purchaseItemId: item.purchaseItemId,
          bookId: item.bookId,
          title: item.book.title,
          author: item.book.author,
          quantity: item.quantity,
          unitPrice,
          subtotal: item.quantity * unitPrice,
        };
      }),
      returnBook: purchase.returnBook
        ? {
            returnBookId: purchase.returnBook.returnBookId,
            purchaseId: purchase.returnBook.purchaseId,
            clientId: purchase.returnBook.clientId,
            reason: (purchase.returnBook.reason as any) ?? null,
            additionalDescription: purchase.returnBook.additionalDescription,
            requestDate: purchase.returnBook.requestDate,
            status: purchase.returnBook.status,
            qrCodeUrl: purchase.returnBook.qrCodeUrl,
            approvalDate: purchase.returnBook.approvalDate ?? null,
            adminNote: purchase.returnBook.adminNote ?? null,
            decisionDate: purchase.returnBook.decisionDate ?? null,
          }
        : null,
    };
  }

  private async validatePurchaseInventory(
    tx: Prisma.TransactionClient,
    clientId: number,
    cartItems: PurchaseCartItem[],
    deliveryMode: DeliveryMode,
    pickupStoreId?: number,
  ): Promise<string | undefined> {
    const requestedItems = this.groupCartItemsByBook(cartItems);
    const requestedBookIds = [...requestedItems.keys()];

    const books = await tx.book.findMany({
      where: { bookId: { in: requestedBookIds } },
      select: {
        bookId: true,
        title: true,
        isAvailable: true,
      },
    });

    if (books.length !== requestedBookIds.length) {
      const foundIds = new Set(books.map((book) => book.bookId));
      const missingBookId = requestedBookIds.find(
        (bookId) => !foundIds.has(bookId),
      );
      throw new NotFoundException(
        `Libro con ID ${missingBookId ?? 'desconocido'} no encontrado`,
      );
    }

    const unavailableBook = books.find((book) => !book.isAvailable);
    if (unavailableBook) {
      throw new BadRequestException(
        `El libro "${unavailableBook.title}" no esta disponible para compra`,
      );
    }

    for (const [bookId, quantity] of requestedItems.entries()) {
      if (quantity > MAX_COPIES_PER_BOOK_PURCHASE) {
        const bookTitle = books.find((book) => book.bookId === bookId)?.title;
        throw new BadRequestException(
          `No puedes comprar mas de ${MAX_COPIES_PER_BOOK_PURCHASE} ejemplares del mismo libro (${bookTitle ?? `libro ${bookId}`})`,
        );
      }
    }

    const reservedQuantities = await this.getReservedQuantitiesForClient(
      tx,
      clientId,
      requestedBookIds,
      pickupStoreId,
    );

    if (deliveryMode === DeliveryMode.storePickup) {
      if (!pickupStoreId) {
        throw new BadRequestException(
          'pickupStoreId es obligatorio cuando deliveryMode es storePickup',
        );
      }

      const pickupStore =
        await this.storesService.findActiveById(pickupStoreId);
      if (!pickupStore) {
        throw new NotFoundException(
          'La tienda de retiro indicada no existe o no esta activa',
        );
      }

      const inventories = await tx.inventory.findMany({
        where: {
          bookId: { in: requestedBookIds },
          storeId: pickupStoreId,
          availableQuantity: { gt: 0 },
        },
        select: {
          inventoryId: true,
          bookId: true,
          storeId: true,
          availableQuantity: true,
        },
      });

      const insufficient = this.findInsufficientBooks(
        requestedItems,
        inventories,
        books,
        reservedQuantities,
      );

      if (insufficient) {
        const alternative = await this.findAlternativePickupStore(
          tx,
          requestedItems,
          pickupStore,
        );

        const suggestion = alternative
          ? `Te sugerimos la tienda "${alternative.name}" en ${alternative.city}.`
          : 'Puedes cambiar a envio a domicilio.';

        throw new BadRequestException(
          `La tienda seleccionada no tiene stock suficiente para retiro. ${suggestion}`,
        );
      }

      return pickupStore.name;
    }

    const inventories = await tx.inventory.findMany({
      where: {
        bookId: { in: requestedBookIds },
        availableQuantity: { gt: 0 },
      },
      select: {
        inventoryId: true,
        bookId: true,
        storeId: true,
        availableQuantity: true,
      },
      orderBy: [{ bookId: 'asc' }, { storeId: 'asc' }],
    });

    this.assertInventoryAvailability(
      requestedItems,
      inventories,
      books,
      reservedQuantities,
    );

    return undefined;
  }

  private async getReservedQuantitiesForClient(
    tx: Prisma.TransactionClient,
    clientId: number,
    requestedBookIds: number[],
    pickupStoreId?: number,
  ): Promise<Map<number, number>> {
    const now = new Date();
    const reservationItems = await tx.reservationItem.findMany({
      where: {
        reservation: {
          clientId,
          status: ReservationStatus.active,
          expirationDate: { gt: now },
        },
        bookId: { in: requestedBookIds },
        storeId: pickupStoreId ? pickupStoreId : undefined,
        quantity: { gt: 0 },
      },
      select: {
        bookId: true,
        quantity: true,
      },
    });

    const reservedQuantities = new Map<number, number>();
    for (const item of reservationItems) {
      reservedQuantities.set(
        item.bookId,
        (reservedQuantities.get(item.bookId) ?? 0) + item.quantity,
      );
    }

    return reservedQuantities;
  }

  private async consumeReservedInventoryForPurchase(
    tx: Prisma.TransactionClient,
    clientId: number,
    requestedItems: Map<number, number>,
    pickupStoreId?: number,
  ): Promise<Map<number, number>> {
    const now = new Date();
    const reservationItems = await tx.reservationItem.findMany({
      where: {
        reservation: {
          clientId,
          status: ReservationStatus.active,
          expirationDate: { gt: now },
        },
        bookId: { in: [...requestedItems.keys()] },
        storeId: pickupStoreId ? pickupStoreId : undefined,
        quantity: { gt: 0 },
      },
      select: {
        reservationItemId: true,
        reservationId: true,
        bookId: true,
        storeId: true,
        quantity: true,
      },
      orderBy: [
        { reservation: { reservationDate: 'asc' } },
        { reservationItemId: 'asc' },
      ],
    });

    const consumedByBook = new Map<number, number>();
    const reservationItemsToUpdate: Array<{
      reservationItemId: number;
      quantity: number;
    }> = [];
    const reservationItemsToDelete: number[] = [];
    const affectedReservationIds = new Set<number>();

    for (const [bookId, requestedQuantity] of requestedItems.entries()) {
      let remaining = requestedQuantity;
      for (const reservationItem of reservationItems) {
        if (remaining <= 0) {
          break;
        }

        if (reservationItem.bookId !== bookId) {
          continue;
        }

        const take = Math.min(remaining, reservationItem.quantity);
        if (take <= 0) {
          continue;
        }

        remaining -= take;
        consumedByBook.set(
          bookId,
          (consumedByBook.get(bookId) ?? 0) + take,
        );
        affectedReservationIds.add(reservationItem.reservationId);

        const leftoverQuantity = reservationItem.quantity - take;
        if (leftoverQuantity > 0) {
          reservationItemsToUpdate.push({
            reservationItemId: reservationItem.reservationItemId,
            quantity: leftoverQuantity,
          });
        } else {
          reservationItemsToDelete.push(reservationItem.reservationItemId);
        }

        await tx.inventory.update({
          where: {
            bookId_storeId: {
              bookId: reservationItem.bookId,
              storeId: reservationItem.storeId,
            },
          },
          data: {
            reservedQuantity: { decrement: take },
          },
        });
      }
    }

    for (const item of reservationItemsToUpdate) {
      await tx.reservationItem.update({
        where: { reservationItemId: item.reservationItemId },
        data: { quantity: item.quantity },
      });
    }

    if (reservationItemsToDelete.length > 0) {
      await tx.reservationItem.deleteMany({
        where: { reservationItemId: { in: reservationItemsToDelete } },
      });
    }

    for (const reservationId of affectedReservationIds) {
      const remainingItems = await tx.reservationItem.count({
        where: { reservationId },
      });
      if (remainingItems === 0) {
        await tx.reservation.update({
          where: { reservationId },
          data: { status: ReservationStatus.converted },
        });
      }
    }

    return consumedByBook;
  }

  private assertInventoryAvailability(
    requestedItems: Map<number, number>,
    inventories: PurchaseBookInventory[],
    books: PurchaseBookAvailability[],
    reservedQuantities: Map<number, number>,
  ): void {
    const availableByBook = new Map<number, number>();

    for (const inventory of inventories) {
      availableByBook.set(
        inventory.bookId,
        (availableByBook.get(inventory.bookId) ?? 0) +
          inventory.availableQuantity,
      );
    }

    for (const [bookId, quantity] of requestedItems.entries()) {
      const available =
        (availableByBook.get(bookId) ?? 0) +
        (reservedQuantities.get(bookId) ?? 0);
      if (available < quantity) {
        const bookTitle = books.find((book) => book.bookId === bookId)?.title;
        throw new BadRequestException(
          `Stock insuficiente para "${bookTitle ?? `bookId ${bookId}`}": solicitado ${quantity}, disponible ${available}`,
        );
      }
    }
  }

  private findInsufficientBooks(
    requestedItems: Map<number, number>,
    inventories: StoreInventoryView[],
    books: PurchaseBookAvailability[],
    reservedQuantities: Map<number, number>,
  ): PurchaseBookAvailability | null {
    const availableByBook = new Map<number, number>();

    for (const inventory of inventories) {
      availableByBook.set(
        inventory.bookId,
        (availableByBook.get(inventory.bookId) ?? 0) +
          inventory.availableQuantity,
      );
    }

    for (const [bookId, quantity] of requestedItems.entries()) {
      const available =
        (availableByBook.get(bookId) ?? 0) +
        (reservedQuantities.get(bookId) ?? 0);
      if (available < quantity) {
        return books.find((book) => book.bookId === bookId) ?? null;
      }
    }

    return null;
  }

  private groupCartItemsByBook(
    cartItems: PurchaseCartItem[],
  ): Map<number, number> {
    const requestedItems = new Map<number, number>();

    for (const item of cartItems) {
      requestedItems.set(
        item.bookId,
        (requestedItems.get(item.bookId) ?? 0) + item.quantity,
      );
    }

    return requestedItems;
  }

  private async findAlternativePickupStore(
    tx: Prisma.TransactionClient,
    requestedItems: Map<number, number>,
    referenceStore: StoreReferenceDto,
  ): Promise<StoreReferenceDto | null> {
    const requestedBookIds = [...requestedItems.keys()];

    const inventories = await tx.inventory.findMany({
      where: {
        bookId: { in: requestedBookIds },
        availableQuantity: { gt: 0 },
        storeId: { not: referenceStore.storeId },
        store: {
          status: 'active',
        },
      },
      select: {
        bookId: true,
        availableQuantity: true,
        store: {
          select: {
            storeId: true,
            name: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    const candidates = new Map<
      number,
      {
        store: StoreReferenceDto;
        availableByBook: Map<number, number>;
      }
    >();

    for (const inventory of inventories) {
      const current = candidates.get(inventory.store.storeId);
      if (!current) {
        candidates.set(inventory.store.storeId, {
          store: {
            storeId: inventory.store.storeId,
            name: inventory.store.name,
            city: inventory.store.city,
            latitude: toNullableNumber(inventory.store.latitude),
            longitude: toNullableNumber(inventory.store.longitude),
          },
          availableByBook: new Map<number, number>(),
        });
      }

      const candidate = candidates.get(inventory.store.storeId);
      candidate.availableByBook.set(
        inventory.bookId,
        (candidate.availableByBook.get(inventory.bookId) ?? 0) +
          inventory.availableQuantity,
      );
    }

    const viableCandidates = [...candidates.values()].filter(
      ({ availableByBook }) => {
        for (const [bookId, quantity] of requestedItems.entries()) {
          if ((availableByBook.get(bookId) ?? 0) < quantity) {
            return false;
          }
        }
        return true;
      },
    );

    if (viableCandidates.length === 0) {
      return null;
    }

    const sameCity = (candidate: StoreReferenceDto) =>
      candidate.city.trim().toLowerCase() ===
      referenceStore.city.trim().toLowerCase();

    const distanceKm = (candidate: StoreReferenceDto) => {
      if (
        referenceStore.latitude == null ||
        referenceStore.longitude == null ||
        candidate.latitude == null ||
        candidate.longitude == null
      ) {
        return Number.POSITIVE_INFINITY;
      }

      const toRad = (degrees: number) => (degrees * Math.PI) / 180;
      const earthRadiusKm = 6371;
      const deltaLat = toRad(candidate.latitude - referenceStore.latitude);
      const deltaLon = toRad(candidate.longitude - referenceStore.longitude);
      const lat1 = toRad(referenceStore.latitude);
      const lat2 = toRad(candidate.latitude);

      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.sin(deltaLon / 2) *
          Math.sin(deltaLon / 2) *
          Math.cos(lat1) *
          Math.cos(lat2);
      return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    viableCandidates.sort((left, right) => {
      const sameCityLeft = sameCity(left.store) ? 1 : 0;
      const sameCityRight = sameCity(right.store) ? 1 : 0;

      if (sameCityLeft !== sameCityRight) {
        return sameCityRight - sameCityLeft;
      }

      const distanceLeft = distanceKm(left.store);
      const distanceRight = distanceKm(right.store);

      if (distanceLeft !== distanceRight) {
        return distanceLeft - distanceRight;
      }

      return left.store.name.localeCompare(right.store.name, 'es');
    });

    return viableCandidates[0].store;
  }

  private async decrementInventoryForPurchase(
    tx: Prisma.TransactionClient,
    inventories: PurchaseBookInventory[],
    quantity: number,
  ): Promise<void> {
    let remaining = quantity;

    for (const inventory of inventories) {
      if (remaining === 0) {
        break;
      }

      const take = Math.min(remaining, inventory.availableQuantity);
      if (take <= 0) {
        continue;
      }

      await tx.inventory.update({
        where: { inventoryId: inventory.inventoryId },
        data: {
          availableQuantity: { decrement: take },
        },
      });

      remaining -= take;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        'No hay inventario suficiente para completar la compra',
      );
    }
  }

  private async sendInvoiceEmail(purchase: {
    purchaseId: number;
    purchaseDate: Date;
    totalAmount: unknown;
    paymentMethod: string | null;
    shippingAddress: string | null;
    deliveryMode: DeliveryMode | null;
    estimatedDeliveryTime: string | null;
    status: PurchaseStatus;
    pickupStore: { name: string } | null;
    client: { user: { email: string; firstName: string } };
    purchaseItems: Array<{
      quantity: number;
      unitPrice: unknown;
      book: { title: string };
    }>;
  }): Promise<void> {
    await this.mailService.sendPurchaseInvoice(purchase.client.user.email, {
      firstName: purchase.client.user.firstName,
      purchaseId: purchase.purchaseId,
      purchaseDateIso: purchase.purchaseDate.toISOString(),
      totalAmount: toNumber(purchase.totalAmount),
      paymentMethod: purchase.paymentMethod || undefined,
      shippingAddress: purchase.shippingAddress || undefined,
      deliveryMode: purchase.deliveryMode || undefined,
      pickupStoreName: purchase.pickupStore?.name,
      estimatedDeliveryTime: purchase.estimatedDeliveryTime || undefined,
      status: purchase.status,
      items: purchase.purchaseItems.map((item) => {
        const unitPrice = toNumber(item.unitPrice);
        return {
          title: item.book.title,
          quantity: item.quantity,
          unitPrice,
          subtotal: unitPrice * item.quantity,
        };
      }),
    });
  }
}
