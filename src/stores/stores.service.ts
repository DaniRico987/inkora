import { Injectable, NotFoundException } from '@nestjs/common';
import { StoreStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StorePublicDto } from './dto/store-public.dto';

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

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableByBook(bookId: number): Promise<StoreAvailabilityDto[]> {
    const inventories = await this.prisma.inventory.findMany({
      where: {
        bookId,
        availableQuantity: { gt: 0 },
        store: {
          status: 'active',
        },
      },
      select: {
        availableQuantity: true,
        store: {
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
        },
      },
      orderBy: {
        storeId: 'asc',
      },
    });

    return inventories
      .map((inventory) => ({
        storeId: inventory.store.storeId,
        name: inventory.store.name,
        address: inventory.store.address,
        city: inventory.store.city,
        latitude: toNullableNumber(inventory.store.latitude),
        longitude: toNullableNumber(inventory.store.longitude),
        capacity: inventory.store.capacity,
        status: inventory.store.status,
        availableQuantity: inventory.availableQuantity,
      }))
      .sort((left, right) => {
        if (left.availableQuantity !== right.availableQuantity) {
          return right.availableQuantity - left.availableQuantity;
        }

        return left.name.localeCompare(right.name, 'es');
      });
  }

  async findAll() {
    return this.prisma.store.findMany({
      orderBy: { storeId: 'asc' },
    });
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

  async create(dto: CreateStoreDto) {
    return this.prisma.store.create({
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
  }

  async update(storeId: number, dto: UpdateStoreDto) {
    await this.assertExists(storeId);

    return this.prisma.store.update({
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
  }

  async delete(storeId: number) {
    await this.assertExists(storeId);

    await this.prisma.$transaction(async (tx) => {
      await tx.reservationItem.deleteMany({
        where: { storeId },
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
}
