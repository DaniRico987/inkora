import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';

export type CreateAuditLogInput = {
  userId: number;
  action: string;
  affectedEntity?: string | null;
  affectedEntityId?: number | null;
  detail?: string | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logOperation(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          affectedEntity: input.affectedEntity ?? null,
          affectedEntityId: input.affectedEntityId ?? null,
          detail: input.detail ?? null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`No se pudo registrar auditoria: ${message}`);
    }
  }

  async listLogs(filters: AuditLogFilterDto) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId !== undefined) {
      where.userId = filters.userId;
    }

    if (filters.user) {
      const userTerm = filters.user.trim();
      if (userTerm.length > 0) {
        where.user = {
          OR: [
            {
              email: {
                contains: userTerm,
                mode: 'insensitive',
              },
            },
            {
              username: {
                contains: userTerm,
                mode: 'insensitive',
              },
            },
          ],
        };
      }
    }

    if (filters.action) {
      where.action = {
        contains: filters.action.trim(),
        mode: 'insensitive',
      };
    }

    if (filters.entity) {
      where.affectedEntity = {
        contains: filters.entity.trim(),
        mode: 'insensitive',
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              userId: true,
              email: true,
              username: true,
              userType: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      items,
    };
  }
}
