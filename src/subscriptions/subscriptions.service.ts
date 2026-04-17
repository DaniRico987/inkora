import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { SubscriptionDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(userId: number, categoryId: number): Promise<void> {
    // Find client
    const client = await this.prisma.client.findUnique({
      where: { userId },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { categoryId },
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Create subscription (unique constraint will handle duplicates)
    try {
      await this.prisma.subscription.create({
        data: {
          clientId: client.clientId,
          categoryId,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Ya está suscrito a esta categoría');
      }
      throw error;
    }
  }

  async unsubscribe(userId: number, categoryId: number): Promise<void> {
    // Find client
    const client = await this.prisma.client.findUnique({
      where: { userId },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const result = await this.prisma.subscription.deleteMany({
      where: {
        clientId: client.clientId,
        categoryId,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException('Suscripción no encontrada');
    }
  }

  async getSubscriptions(userId: number): Promise<SubscriptionDto[]> {
    // Find client
    const client = await this.prisma.client.findUnique({
      where: { userId },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: { clientId: client.clientId },
      include: {
        category: true,
      },
      orderBy: { subscribedAt: 'desc' },
    });

    return subscriptions.map((sub) => ({
      id: sub.subscriptionId,
      categoryId: sub.categoryId,
      categoryName: sub.category.name,
      subscribedAt: sub.subscribedAt,
    }));
  }
}