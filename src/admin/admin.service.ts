import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveAdmins() {
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
    });

    return admins.map((admin) => ({
      adminId: admin.adminId,
      userId: admin.userId,
      dni: admin.user.dni,
      firstName: admin.user.firstName,
      lastName: admin.user.lastName,
      email: admin.user.email,
      username: admin.user.username,
      createdByRootId: admin.createdByRootId,
      isTemporaryPassword: admin.isTemporaryPassword,
    }));
  }
}


