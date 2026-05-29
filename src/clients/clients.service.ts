import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PurchaseStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import {
  ClientHistoryEntryDto,
  GetClientHistoryQueryDto,
} from './dto/client-history.dto';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { CreateClientCardDto } from './dto/create-client-card.dto';
import { ClientMeResponseDto } from './dto/client-me-response.dto';

const PURCHASE_STATUS_VALUES = new Set<string>(Object.values(PurchaseStatus));
const RESERVATION_STATUS_VALUES = new Set<string>(
  Object.values(ReservationStatus),
);

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseFloat(value);
  return Number.parseFloat(String(value));
};

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) { }

  async getMyProfile(userId: number): Promise<ClientMeResponseDto> {
    const now = new Date();
    const client = await this.prisma.client.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            vouchers: {
              where: {
                isUsed: false,
                expiresAt: {
                  gt: now,
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
        subscriptions: {
          include: { category: true },
          orderBy: { subscribedAt: 'desc' },
        },
        paymentCards: {
          where: { isActive: true },
          orderBy: { cardId: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return {
      clientId: client.clientId,
      userId: client.userId,
      dni: client.user.dni,
      firstName: client.user.firstName,
      lastName: client.user.lastName,
      email: client.user.email,
      username: client.user.username,
      birthDate: client.user.birthDate,
      birthPlace: client.user.birthPlace,
      address: client.user.address,
      postalCode: client.user.postalCode,
      addressComplement: client.user.addressComplement,
      addressLocation: client.user.addressLocation,
      gender: client.user.gender,
      subscriptions: client.subscriptions.map((sub) => ({
        subscriptionId: sub.subscriptionId,
        categoryId: sub.categoryId,
        categoryName: sub.category.name,
        subscribedAt: sub.subscribedAt,
      })),
      cards: client.paymentCards.map((card) => ({
        cardId: card.cardId,
        maskedNumber: card.maskedNumber,
        cardType: card.cardType,
        expirationDate: card.expirationDate,
        cardHolder: card.cardHolder,
      })),
      activeBirthdayVoucher: client.user.vouchers[0]
        ? {
          code: client.user.vouchers[0].code,
          discountPercentage: toNumber(
            client.user.vouchers[0].discountPercentage,
          ),
          expiresAt: client.user.vouchers[0].expiresAt,
          generatedAt: client.user.vouchers[0].createdAt,
        }
        : null,
    };
  }

  async updateMyProfile(
    userId: number,
    payload: UpdateClientProfileDto,
  ): Promise<ClientMeResponseDto> {
    const client = await this.prisma.client.findUnique({
      where: { userId },
      select: { clientId: true, userId: true },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const data: Prisma.UserUpdateInput = {};
    if (payload.firstName !== undefined) data.firstName = payload.firstName;
    if (payload.lastName !== undefined) data.lastName = payload.lastName;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.username !== undefined) data.username = payload.username;
    if (payload.birthPlace !== undefined) data.birthPlace = payload.birthPlace;
    if (payload.address !== undefined) data.address = payload.address;
    if (payload.postalCode !== undefined) data.postalCode = payload.postalCode;
    if (payload.addressComplement !== undefined)
      data.addressComplement = payload.addressComplement;
    if (payload.gender !== undefined) data.gender = payload.gender;
    if (payload.birthDate !== undefined)
      data.birthDate = new Date(payload.birthDate);

    try {
      await this.prisma.user.update({
        where: { userId: client.userId },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('El email o username ya está en uso');
      }
      throw error;
    }

    return this.getMyProfile(userId);
  }

  async createMyCard(
    userId: number,
    payload: CreateClientCardDto,
  ): Promise<ClientMeResponseDto> {
    const client = await this.prisma.client.findUnique({
      where: { userId },
      select: { clientId: true },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    await this.prisma.paymentCard.create({
      data: {
        clientId: client.clientId,
        maskedNumber: payload.maskedNumber,
        cardType: payload.cardType,
        expirationDate: new Date(payload.expirationDate),
        cardHolder: payload.cardHolder,
        isActive: true,
      },
    });

    return this.getMyProfile(userId);
  }

  async deleteMyCard(userId: number, cardId: number): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { userId },
      select: { clientId: true },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const result = await this.prisma.paymentCard.updateMany({
      where: {
        cardId,
        clientId: client.clientId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Tarjeta no encontrada');
    }
  }

  async getClientHistory(
    clientId: number,
    query: GetClientHistoryQueryDto,
  ): Promise<ClientHistoryEntryDto[]> {
    const requestedStatus = query.status?.trim();

    const shouldIncludePurchases = !query.type || query.type === 'purchases';
    const shouldIncludeReservations =
      !query.type || query.type === 'reservations';

    if (requestedStatus) {
      const purchaseStatusAllowed = shouldIncludePurchases
        ? PURCHASE_STATUS_VALUES.has(requestedStatus)
        : false;
      const reservationStatusAllowed = shouldIncludeReservations
        ? RESERVATION_STATUS_VALUES.has(requestedStatus)
        : false;

      if (!purchaseStatusAllowed && !reservationStatusAllowed) {
        throw new BadRequestException(
          'Filtro status invalido para el tipo solicitado',
        );
      }
    }

    const [purchases, reservations] = await Promise.all([
      shouldIncludePurchases
        ? this.prisma.purchase.findMany({
          where: {
            clientId,
            ...(requestedStatus && PURCHASE_STATUS_VALUES.has(requestedStatus)
              ? { status: requestedStatus as PurchaseStatus }
              : {}),
          },
          include: {
            purchaseItems: {
              include: {
                book: {
                  select: {
                    bookId: true,
                    title: true,
                    author: true,
                  },
                },
              },
              orderBy: { purchaseItemId: 'asc' },
            },
          },
        })
        : Promise.resolve([]),
      shouldIncludeReservations
        ? this.prisma.reservation.findMany({
          where: {
            clientId,
            ...(requestedStatus &&
              RESERVATION_STATUS_VALUES.has(requestedStatus)
              ? { status: requestedStatus as ReservationStatus }
              : {}),
          },
          include: {
            reservationItems: {
              include: {
                book: {
                  select: {
                    bookId: true,
                    title: true,
                    author: true,
                    price: true,
                  },
                },
              },
              orderBy: { reservationItemId: 'asc' },
            },
          },
        })
        : Promise.resolve([]),
    ]);

    const nowMs = Date.now();

    const purchaseEntries: ClientHistoryEntryDto[] = purchases.map(
      (purchase) => ({
        type: 'purchase',
        transactionId: purchase.purchaseId,
        transactionDate: purchase.purchaseDate,
        status: purchase.status,
        totalAmount: toNumber(purchase.totalAmount),
        items: purchase.purchaseItems.map((item) => {
          const unitPrice = toNumber(item.unitPrice);
          return {
            bookId: item.book.bookId,
            title: item.book.title,
            author: item.book.author,
            quantity: item.quantity,
            unitPrice,
            subtotal: unitPrice * item.quantity,
          };
        }),
      }),
    );

    const reservationEntries: ClientHistoryEntryDto[] = reservations.map(
      (reservation) => {
        const remainingTimeSeconds =
          reservation.status === ReservationStatus.active
            ? Math.max(
              0,
              Math.floor(
                (reservation.expirationDate.getTime() - nowMs) / 1000,
              ),
            )
            : undefined;

        const items = reservation.reservationItems.map((item) => {
          const unitPrice = toNumber(item.book.price);
          return {
            bookId: item.book.bookId,
            title: item.book.title,
            author: item.book.author,
            quantity: item.quantity,
            unitPrice,
            subtotal: unitPrice * item.quantity,
          };
        });

        return {
          type: 'reservation',
          transactionId: reservation.reservationId,
          transactionDate: reservation.reservationDate,
          status: reservation.status,
          totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
          items,
          expirationDate: reservation.expirationDate,
          remainingTimeSeconds,
        };
      },
    );

    return [...purchaseEntries, ...reservationEntries].sort((left, right) => {
      return right.transactionDate.getTime() - left.transactionDate.getTime();
    });
  }
}
