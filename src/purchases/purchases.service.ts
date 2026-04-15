import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryMode, PurchaseStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  return Number.parseFloat(String(value));
};

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
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

    if (dto.deliveryMode === DeliveryMode.homeDelivery && !dto.shippingAddress) {
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
      throw new BadRequestException('El carrito no tiene items para confirmar compra');
    }

    let pickupStoreName: string | undefined;
    if (dto.deliveryMode === DeliveryMode.storePickup) {
      const store = await this.prisma.store.findUnique({
        where: { storeId: dto.pickupStoreId },
        select: { storeId: true, name: true, status: true },
      });

      if (!store) {
        throw new NotFoundException('La tienda de retiro indicada no existe');
      }

      if (store.status !== 'active') {
        throw new BadRequestException('La tienda de retiro indicada no esta activa');
      }

      pickupStoreName = store.name;
    }

    const totalAmount = cart.cartItems.reduce((sum, item) => {
      return sum + item.quantity * toNumber(item.unitPrice);
    }, 0);

    const estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(
      dto.deliveryMode,
      pickupStoreName,
    );

    const purchase = await this.prisma.$transaction(async (tx) => {
      const createdPurchase = await tx.purchase.create({
        data: {
          clientId,
          totalAmount,
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
            create: cart.cartItems.map((item) => ({
              bookId: item.bookId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
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

      await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });

      return createdPurchase;
    });

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
      throw new ForbiddenException('No tienes permiso para modificar esta compra');
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
    };
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
