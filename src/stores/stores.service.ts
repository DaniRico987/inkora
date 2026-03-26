import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.store.findMany({
      orderBy: { storeId: 'asc' },
    });
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

