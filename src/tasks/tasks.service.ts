import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { VouchersService } from '../vouchers/vouchers.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vouchersService: VouchersService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleBirthdayCron() {
    this.logger.log('Ejecutando cron de cumpleaños');
    const clients = await this.prisma.client.findMany({ include: { user: true } });
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    for (const client of clients) {
      const user = client.user;
      if (!user || !user.birthDate) continue;
      const bd = new Date(user.birthDate);
      if (bd.getUTCDate() === day && bd.getUTCMonth() + 1 === month) {
        try {
          await this.vouchersService.createBirthdayVoucher(user);
          this.logger.log(`Voucher creado para usuario ${user.userId}`);
        } catch (err) {
          this.logger.error('Error creando voucher de cumpleaños', err as any);
        }
      }
    }
  }
}
