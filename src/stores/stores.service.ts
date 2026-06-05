import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseStatus, StoreStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StorePublicDto } from './dto/store-public.dto';
import { StoreResponseDto } from './dto/store-response.dto';
import { StoreNearestDto } from './dto/store-nearest-response.dto';
import { StoreInventoryResponseDto } from './dto/store-inventory-response.dto';
import { StoreInventoryItemDto } from './dto/store-inventory-item.dto';
import { StoreOrdersResponseDto } from './dto/store-orders-response.dto';
import { StoreOrderResponseDto } from './dto/store-order-response.dto';
import { UpdateStoreInventoryDto } from './dto/update-store-inventory.dto';

export type StoreAvailabilityDto = {
  storeId: number;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  status: StoreStatus;
  availableQuantity: number;
};

export type StoreReferenceDto = {
  storeId: number;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

type StoreSummarySelect = {
  storeId: number;
  name: string;
  address: string;
  city: string;
  latitude: unknown;
  longitude: unknown;
  capacity: number | null;
  status: StoreStatus;
};

type StoreOrderItemSelect = {
  purchaseItemId: number;
  bookId: number;
  quantity: number;
  unitPrice: unknown;
  book: {
    title: string;
    author: string;
  };
};

type StoreOrderSelect = {
  purchaseId: number;
  purchaseDate: Date;
  status: PurchaseStatus;
  totalAmount: unknown;
  deliveryMode: null | 'homeDelivery' | 'storePickup';
  pickupStoreId: number | null;
  dispatchDate: Date | null;
  client: {
    clientId: number;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  purchaseItems: StoreOrderItemSelect[];
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) { }

  async findAvailableByBook(bookId: number): Promise<StoreAvailabilityDto[]> {
    const stores = await this.prisma.store.findMany({
      where: {
        status: 'active',
      },
      select: {
        storeId: true,
        name: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        capacity: true,
        status: true,
        inventories: {
          where: { bookId },
          select: { availableQuantity: true },
          take: 1,
        },
      },
      orderBy: {
        storeId: 'asc',
      },
    });

    return stores
      .map((store) => ({
        storeId: store.storeId,
        name: store.name,
        address: store.address,
        city: store.city,
        latitude: toNullableNumber(store.latitude),
        longitude: toNullableNumber(store.longitude),
        capacity: store.capacity,
        status: store.status,
        availableQuantity: store.inventories[0]?.availableQuantity ?? 0,
      }))
      .sort((left, right) => {
        if (left.availableQuantity !== right.availableQuantity) {
          return right.availableQuantity - left.availableQuantity;
        }

        return left.name.localeCompare(right.name, 'es');
      });
  }

  async findAll(): Promise<StoreResponseDto[]> {
    const stores = await this.prisma.store.findMany({
      orderBy: { storeId: 'asc' },
    });

    return stores.map((store) => this.mapStore(store));
  }

  async findPublicStores(): Promise<StorePublicDto[]> {
    const stores = await this.prisma.store.findMany({
      where: {
        status: 'active',
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        storeId: true,
        name: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { storeId: 'asc' },
    });

    return stores.map((store) => ({
      storeId: store.storeId,
      name: store.name,
      address: store.address,
      city: store.city,
      latitude: toNullableNumber(store.latitude),
      longitude: toNullableNumber(store.longitude),
    }));
  }

  async findNearestStores(
    latitude: number,
    longitude: number,
  ): Promise<StoreNearestDto[]> {
    const stores = await this.prisma.store.findMany({
      where: {
        status: 'active',
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        storeId: true,
        name: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { storeId: 'asc' },
    });

    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;

    return stores
      .map((store): StoreNearestDto => {
        const storeLatitude = toNullableNumber(store.latitude);
        const storeLongitude = toNullableNumber(store.longitude);

        if (storeLatitude == null || storeLongitude == null) {
          return {
            storeId: store.storeId,
            name: store.name,
            address: store.address,
            city: store.city,
            latitude: storeLatitude,
            longitude: storeLongitude,
            distanceKm: Number.POSITIVE_INFINITY,
          };
        }

        const deltaLat = toRadians(storeLatitude - latitude);
        const deltaLon = toRadians(storeLongitude - longitude);
        const originLat = toRadians(latitude);
        const storeLat = toRadians(storeLatitude);

        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2) *
            Math.cos(originLat) *
            Math.cos(storeLat);

        const distanceKm =
          2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return {
          storeId: store.storeId,
          name: store.name,
          address: store.address,
          city: store.city,
          latitude: storeLatitude,
          longitude: storeLongitude,
          distanceKm,
        };
      })
      .sort((left, right) => {
        if (left.distanceKm !== right.distanceKm) {
          return left.distanceKm - right.distanceKm;
        }

        return left.name.localeCompare(right.name, 'es');
      })
      .map((store) => ({
        ...store,
        distanceKm: Number.isFinite(store.distanceKm)
          ? Number(store.distanceKm.toFixed(2))
          : store.distanceKm,
      }));
  }

  async create(dto: CreateStoreDto): Promise<StoreResponseDto> {
    const store = await this.prisma.store.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        capacity: dto.capacity ?? null,
        status: dto.status ?? 'active',
      },
    });

    return this.mapStore(store);
  }

  async update(
    storeId: number,
    dto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    await this.assertExists(storeId);

    const store = await this.prisma.store.update({
      where: { storeId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    return this.mapStore(store);
  }

  async delete(storeId: number) {
    await this.assertExists(storeId);

    const pendingOrders = await this.prisma.purchase.count({
      where: {
        pickupStoreId: storeId,
        status: {
          in: [PurchaseStatus.inPreparation, PurchaseStatus.shipped],
        },
      },
    });

    if (pendingOrders > 0) {
      throw new BadRequestException(
        'No se puede eliminar la tienda porque tiene pedidos pendientes en preparación o envío',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reservationItem.updateMany({
        where: { storeId },
        data: { storeId: null },
      });

      await tx.inventory.deleteMany({
        where: { storeId },
      });

      await tx.purchase.updateMany({
        where: { pickupStoreId: storeId },
        data: { pickupStoreId: null },
      });

      await tx.store.delete({
        where: { storeId },
      });
    });

    return { id: storeId };
  }

  async findInventoryByStoreId(
    storeId: number,
  ): Promise<StoreInventoryResponseDto> {
    const store = await this.findStoreSummaryOrThrow(storeId);
    const inventories = await this.prisma.inventory.findMany({
      where: { storeId },
      select: {
        bookId: true,
        availableQuantity: true,
        reservedQuantity: true,
        book: {
          select: {
            title: true,
            author: true,
          },
        },
      },
      orderBy: [{ bookId: 'asc' }],
    });

    const items = inventories.map(
      (inventory): StoreInventoryItemDto => ({
        bookId: inventory.bookId,
        title: inventory.book.title,
        author: inventory.book.author,
        availableQuantity: inventory.availableQuantity,
        reservedQuantity: inventory.reservedQuantity,
        totalQuantity: inventory.availableQuantity + inventory.reservedQuantity,
      }),
    );

    return {
      store: this.mapStore(store),
      items,
      totalAvailableQuantity: items.reduce(
        (sum, item) => sum + item.availableQuantity,
        0,
      ),
      totalReservedQuantity: items.reduce(
        (sum, item) => sum + item.reservedQuantity,
        0,
      ),
    };
  }

  async updateInventoryByStoreId(
    storeId: number,
    dto: UpdateStoreInventoryDto,
  ): Promise<StoreInventoryResponseDto> {
    await this.findStoreSummaryOrThrow(storeId);

    for (const item of dto.items) {
      if (item.availableQuantity < 0) {
        throw new BadRequestException('availableQuantity no puede ser negativo');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await tx.inventory.upsert({
          where: { bookId_storeId: { bookId: item.bookId, storeId } },
          create: {
            bookId: item.bookId,
            storeId,
            availableQuantity: item.availableQuantity,
            reservedQuantity: 0,
          },
          update: {
            availableQuantity: item.availableQuantity,
          },
        });
      }
    });

    return this.findInventoryByStoreId(storeId);
  }

  async findOrdersByStoreId(storeId: number): Promise<StoreOrdersResponseDto> {
    const store = await this.findStoreSummaryOrThrow(storeId);
    const purchases = await this.prisma.purchase.findMany({
      where: { pickupStoreId: storeId },
      select: {
        purchaseId: true,
        purchaseDate: true,
        status: true,
        totalAmount: true,
        deliveryMode: true,
        pickupStoreId: true,
        dispatchDate: true,
        client: {
          select: {
            clientId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        purchaseItems: {
          select: {
            purchaseItemId: true,
            bookId: true,
            quantity: true,
            unitPrice: true,
            book: {
              select: {
                title: true,
                author: true,
              },
            },
          },
        },
      },
      orderBy: [{ purchaseDate: 'desc' }, { purchaseId: 'desc' }],
    });

    const orders = purchases.map(
      (purchase): StoreOrderResponseDto => ({
        purchaseId: purchase.purchaseId,
        purchaseDate: purchase.purchaseDate,
        status: purchase.status,
        totalAmount: toNullableNumber(purchase.totalAmount) ?? 0,
        deliveryMode: purchase.deliveryMode,
        pickupStoreId: purchase.pickupStoreId,
        dispatchDate: purchase.dispatchDate,
        client: {
          clientId: purchase.client.clientId,
          firstName: purchase.client.user.firstName,
          lastName: purchase.client.user.lastName,
          email: purchase.client.user.email,
        },
        items: purchase.purchaseItems.map((item) => ({
          purchaseItemId: item.purchaseItemId,
          bookId: item.bookId,
          title: item.book.title,
          author: item.book.author,
          quantity: item.quantity,
          unitPrice: toNullableNumber(item.unitPrice) ?? 0,
          subtotal: (toNullableNumber(item.unitPrice) ?? 0) * item.quantity,
        })),
      }),
    );

    return {
      store: this.mapStore(store),
      orders,
      totalOrders: orders.length,
      pendingOrders: orders.filter(
        (order) =>
          order.status === PurchaseStatus.inPreparation ||
          order.status === PurchaseStatus.shipped,
      ).length,
    };
  }

  async findActiveById(storeId: number): Promise<StoreReferenceDto | null> {
    return this.prisma.store
      .findFirst({
        where: {
          storeId,
          status: 'active',
        },
        select: {
          storeId: true,
          name: true,
          city: true,
          latitude: true,
          longitude: true,
        },
      })
      .then((store) =>
        store
          ? {
            storeId: store.storeId,
            name: store.name,
            city: store.city,
            latitude: toNullableNumber(store.latitude),
            longitude: toNullableNumber(store.longitude),
          }
          : null,
      );
  }

  private async assertExists(storeId: number) {
    const existing = await this.prisma.store.findUnique({
      where: { storeId },
      select: { storeId: true },
    });
    if (!existing) {
      throw new NotFoundException('Tienda no encontrada');
    }
  }

  private async findStoreSummaryOrThrow(
    storeId: number,
  ): Promise<StoreSummarySelect> {
    const store = await this.prisma.store.findUnique({
      where: { storeId },
      select: {
        storeId: true,
        name: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        capacity: true,
        status: true,
      },
    });

    if (!store) {
      throw new NotFoundException('Tienda no encontrada');
    }

    return store;
  }

  private mapStore(store: StoreSummarySelect): StoreResponseDto {
    return {
      storeId: store.storeId,
      name: store.name,
      address: store.address,
      city: store.city,
      latitude: toNullableNumber(store.latitude),
      longitude: toNullableNumber(store.longitude),
      capacity: store.capacity,
      status: store.status,
    };
  }
}
