import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveAdmins(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // Get total count
    const totalCount = await this.prisma.admin.count({
      where: {
        user: {
          status: 'active',
          userType: 'admin',
        },
      },
    });

    // Get paginated admins
    const admins = await this.prisma.admin.findMany({
      where: {
        user: {
          status: 'active',
          userType: 'admin',
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        adminId: 'asc',
      },
      skip,
      take: limit,
    });

    const items = admins.map((admin) => ({
      adminId: admin.userId.toString(),
      userId: admin.userId,
      username: admin.user.username,
      email: admin.user.email,
      isActive: admin.user.status === 'active',
      createdAt: admin.user.registrationDate?.toISOString(),
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return {
      items,
      totalPages,
      currentPage: page,
      totalCount,
    };
  }
}



