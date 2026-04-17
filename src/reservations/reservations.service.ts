import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';

const MAX_DIFFERENT_BOOKS_PER_CLIENT = 5;
const MAX_COPIES_PER_BOOK = 3;
const RESERVATION_DURATION_MS = 24 * 60 * 60 * 1000;

type InventoryProjection = {
  inventoryId: number;
  bookId: number;
  storeId: number;
  availableQuantity: number;
  reservedQuantity: number;
};

type ReservationAllocation = {
  bookId: number;
  storeId: number;
  quantity: number;
};

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReservation(
    clientId: number,
    dto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    try {
      const client = await this.prisma.client.findUnique({
        where: { clientId },
        select: { clientId: true },
      });

      if (!client) {
        throw new BadRequestException(
          'El usuario autenticado no tiene un cliente valido para reservar',
        );
      }

      const requestedItems = this.aggregateRequestedItems(dto);
      this.assertRequestLimits(requestedItems);

      await this.assertClientActiveReservationLimits(clientId, requestedItems);

      const requestedBookIds = [...requestedItems.keys()];
      const books = await this.prisma.book.findMany({
        where: { bookId: { in: requestedBookIds } },
        select: {
          bookId: true,
          title: true,
          isAvailable: true,
        },
      });

      if (books.length !== requestedBookIds.length) {
        const foundIds = new Set(books.map((book) => book.bookId));
        const missingBookId = requestedBookIds.find((bookId) => !foundIds.has(bookId));
        throw new NotFoundException(
          `Libro con ID ${missingBookId ?? 'desconocido'} no encontrado`,
        );
      }

      const unavailableBook = books.find((book) => !book.isAvailable);
      if (unavailableBook) {
        throw new BadRequestException(
          `El libro "${unavailableBook.title}" no esta disponible para reserva`,
        );
      }

      const availableInventory = await this.prisma.inventory.findMany({
        where: {
          bookId: { in: requestedBookIds },
          availableQuantity: { gt: 0 },
        },
        select: {
          inventoryId: true,
          bookId: true,
          storeId: true,
          availableQuantity: true,
          reservedQuantity: true,
        },
        orderBy: [{ bookId: 'asc' }, { storeId: 'asc' }],
      });

      this.assertInventoryAvailability(requestedItems, availableInventory, books);

      const expirationDate = new Date(Date.now() + RESERVATION_DURATION_MS);

      const created = await this.prisma.$transaction(async (tx) => {
        const allocations: ReservationAllocation[] = [];

        for (const [bookId, quantity] of requestedItems.entries()) {
          const bookAllocations = await this.allocateInventoryForReservation(
            tx,
            bookId,
            quantity,
          );
          allocations.push(...bookAllocations);
        }

        return tx.reservation.create({
          data: {
            clientId,
            status: ReservationStatus.active,
            expirationDate,
            reservationItems: {
              create: allocations.map((allocation) => ({
                bookId: allocation.bookId,
                storeId: allocation.storeId,
                quantity: allocation.quantity,
              })),
            },
          },
          include: {
            reservationItems: {
              include: {
                book: {
                  select: {
                    title: true,
                  },
                },
              },
              orderBy: { reservationItemId: 'asc' },
            },
          },
        });
      });

      return {
        reservationId: created.reservationId,
        clientId: created.clientId,
        status: created.status,
        reservationDate: created.reservationDate,
        expirationDate: created.expirationDate,
        items: created.reservationItems.map((item) => ({
          reservationItemId: item.reservationItemId,
          bookId: item.bookId,
          title: item.book.title,
          quantity: item.quantity,
        })),
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      const prismaErrorCode =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code: unknown }).code)
          : null;

      if (prismaErrorCode === 'P2003') {
        throw new BadRequestException(
          'No se pudo crear la reserva por una relacion invalida (cliente/libro)',
        );
      }

      if (prismaErrorCode === 'P2011') {
        throw new BadRequestException(
          'No se pudo crear la reserva porque faltan datos requeridos en la tabla reservation_item. Revisa migraciones pendientes de reservas.',
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error inesperado al crear reserva: ${message}`);
      throw new BadRequestException(
        'No se pudo crear la reserva por un error interno de datos',
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expireReservationsCron(): Promise<void> {
    const now = new Date();
    const expiredReservations = await this.prisma.reservation.findMany({
      where: {
        status: ReservationStatus.active,
        expirationDate: { lte: now },
      },
      include: {
        reservationItems: {
          select: {
            bookId: true,
            storeId: true,
            quantity: true,
          },
        },
      },
      orderBy: { reservationId: 'asc' },
    });

    if (expiredReservations.length === 0) {
      return;
    }

    let processed = 0;

    for (const reservation of expiredReservations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          for (const item of reservation.reservationItems) {
            await this.releaseReservedInventory(
              tx,
              item.bookId,
              item.quantity,
              item.storeId,
            );
          }

          await tx.reservation.update({
            where: { reservationId: reservation.reservationId },
            data: { status: ReservationStatus.expired },
          });
        });

        processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `No se pudo expirar la reserva ${reservation.reservationId}: ${message}`,
        );
      }
    }

    if (processed > 0) {
      this.logger.log(`Reservas expiradas automaticamente: ${processed}`);
    }
  }

  private aggregateRequestedItems(dto: CreateReservationDto): Map<number, number> {
    const aggregated = new Map<number, number>();

    for (const item of dto.items) {
      const current = aggregated.get(item.bookId) ?? 0;
      aggregated.set(item.bookId, current + item.quantity);
    }

    return aggregated;
  }

  private assertRequestLimits(requestedItems: Map<number, number>): void {
    if (requestedItems.size > MAX_DIFFERENT_BOOKS_PER_CLIENT) {
      throw new BadRequestException(
        `No puedes reservar mas de ${MAX_DIFFERENT_BOOKS_PER_CLIENT} libros diferentes`,
      );
    }

    for (const [bookId, quantity] of requestedItems.entries()) {
      if (quantity > MAX_COPIES_PER_BOOK) {
        throw new BadRequestException(
          `El libro con ID ${bookId} excede el limite de ${MAX_COPIES_PER_BOOK} ejemplares`,
        );
      }
    }
  }

  private async assertClientActiveReservationLimits(
    clientId: number,
    requestedItems: Map<number, number>,
  ): Promise<void> {
    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        clientId,
        status: ReservationStatus.active,
        expirationDate: {
          gt: new Date(),
        },
      },
      select: {
        reservationItems: {
          select: {
            bookId: true,
            quantity: true,
          },
        },
      },
    });

    const currentMap = new Map<number, number>();

    for (const reservation of activeReservations) {
      for (const item of reservation.reservationItems) {
        currentMap.set(item.bookId, (currentMap.get(item.bookId) ?? 0) + item.quantity);
      }
    }

    for (const [bookId, quantity] of requestedItems.entries()) {
      currentMap.set(bookId, (currentMap.get(bookId) ?? 0) + quantity);
    }

    if (currentMap.size > MAX_DIFFERENT_BOOKS_PER_CLIENT) {
      throw new BadRequestException(
        `No puedes tener mas de ${MAX_DIFFERENT_BOOKS_PER_CLIENT} libros diferentes en reservas activas`,
      );
    }

    for (const [bookId, quantity] of currentMap.entries()) {
      if (quantity > MAX_COPIES_PER_BOOK) {
        throw new BadRequestException(
          `No puedes tener mas de ${MAX_COPIES_PER_BOOK} ejemplares activos del libro con ID ${bookId}`,
        );
      }
    }
  }

  private assertInventoryAvailability(
    requestedItems: Map<number, number>,
    inventories: InventoryProjection[],
    books: Array<{ bookId: number; title: string }>,
  ): void {
    const availableByBook = new Map<number, number>();

    for (const inventory of inventories) {
      availableByBook.set(
        inventory.bookId,
        (availableByBook.get(inventory.bookId) ?? 0) + inventory.availableQuantity,
      );
    }

    for (const [bookId, quantity] of requestedItems.entries()) {
      const available = availableByBook.get(bookId) ?? 0;
      if (available < quantity) {
        const bookTitle = books.find((book) => book.bookId === bookId)?.title;
        throw new BadRequestException(
          `Stock insuficiente para "${bookTitle ?? `bookId ${bookId}`}": solicitado ${quantity}, disponible ${available}`,
        );
      }
    }
  }

  private async allocateInventoryForReservation(
    tx: Prisma.TransactionClient,
    bookId: number,
    quantity: number,
  ): Promise<ReservationAllocation[]> {
    const inventories = await tx.inventory.findMany({
      where: {
        bookId,
        availableQuantity: { gt: 0 },
      },
      select: {
        inventoryId: true,
        storeId: true,
        availableQuantity: true,
      },
      orderBy: { storeId: 'asc' },
    });

    let remaining = quantity;
    const allocations: ReservationAllocation[] = [];

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
          reservedQuantity: { increment: take },
        },
      });

      allocations.push({
        bookId,
        storeId: inventory.storeId,
        quantity: take,
      });

      remaining -= take;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `No hay inventario suficiente para completar la reserva del libro ${bookId}`,
      );
    }

    return allocations;
  }

  private async releaseReservedInventory(
    tx: Prisma.TransactionClient,
    bookId: number,
    quantity: number,
    preferredStoreId?: number | null,
  ): Promise<void> {
    const inventories = preferredStoreId
      ? await tx.inventory.findMany({
          where: {
            bookId,
            storeId: preferredStoreId,
            reservedQuantity: { gt: 0 },
          },
          select: {
            inventoryId: true,
            reservedQuantity: true,
          },
          orderBy: { storeId: 'asc' },
        })
      : await tx.inventory.findMany({
          where: {
            bookId,
            reservedQuantity: { gt: 0 },
          },
          select: {
            inventoryId: true,
            reservedQuantity: true,
          },
          orderBy: { storeId: 'asc' },
        });

    let remaining = quantity;

    for (const inventory of inventories) {
      if (remaining === 0) {
        break;
      }

      const release = Math.min(remaining, inventory.reservedQuantity);
      if (release <= 0) {
        continue;
      }

      await tx.inventory.update({
        where: { inventoryId: inventory.inventoryId },
        data: {
          availableQuantity: { increment: release },
          reservedQuantity: { decrement: release },
        },
      });

      remaining -= release;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `No hay stock reservado suficiente para liberar ${quantity} unidades del libro ${bookId}`,
      );
    }
  }
}
