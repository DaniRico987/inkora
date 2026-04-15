import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
