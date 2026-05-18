import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { StoresModule } from '../stores/stores.module';
import { WalletModule } from '../wallet/wallet.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [PrismaModule, MailModule, StoresModule, WalletModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
