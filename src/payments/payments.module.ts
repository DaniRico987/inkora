import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ConfigModule, PrismaModule, CartModule, PurchasesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentGatewayService],
})
export class PaymentsModule {}