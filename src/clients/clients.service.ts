import { BadRequestException, Injectable } from '@nestjs/common';
import { PurchaseStatus, ReservationStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import {
    ClientHistoryEntryDto,
    GetClientHistoryQueryDto,
} from './dto/client-history.dto';

const PURCHASE_STATUS_VALUES = new Set<string>(Object.values(PurchaseStatus));
const RESERVATION_STATUS_VALUES = new Set<string>(Object.values(ReservationStatus));

const toNumber = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number.parseFloat(value);
    return Number.parseFloat(String(value));
};

@Injectable()
export class ClientsService {
    constructor(private readonly prisma: PrismaService) { }

    async getClientHistory(
        clientId: number,
        query: GetClientHistoryQueryDto,
    ): Promise<ClientHistoryEntryDto[]> {
        const requestedStatus = query.status?.trim();

        const shouldIncludePurchases = !query.type || query.type === 'purchases';
        const shouldIncludeReservations = !query.type || query.type === 'reservations';

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
                        ...(requestedStatus && RESERVATION_STATUS_VALUES.has(requestedStatus)
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

        const purchaseEntries: ClientHistoryEntryDto[] = purchases.map((purchase) => ({
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
        }));

        const reservationEntries: ClientHistoryEntryDto[] = reservations.map(
            (reservation) => {
                const remainingTimeSeconds =
                    reservation.status === ReservationStatus.active
                        ? Math.max(
                            0,
                            Math.floor((reservation.expirationDate.getTime() - nowMs) / 1000),
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
