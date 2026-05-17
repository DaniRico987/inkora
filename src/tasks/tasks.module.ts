import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../../prisma/prisma/prisma.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [PrismaModule, VouchersModule],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
