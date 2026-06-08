import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { CartModule } from './cart/cart.module';
import { MailModule } from './mail/mail.module';
import { RecaptchaModule } from './recaptcha/recaptcha.module';
import { CategoriesModule } from './categories/categories.module';
import { AdminModule } from './admin/admin.module';
import { StoresModule } from './stores/stores.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PaymentsModule } from './payments/payments.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { ConversationsModule } from './conversations/conversations.module';
import { TasksModule } from './tasks/tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule } from './clients/clients.module';
import { WalletModule } from './wallet/wallet.module';
import { ReturnsModule } from './returns/returns.module';
import { RefundsModule } from './refunds/refunds.module';
import { AuditModule } from './audit/audit.module';
import { GeoModule } from './geo/geo.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    AuthModule,
    BooksModule,
    CartModule,
    MailModule,
    RecaptchaModule,
    CategoriesModule,
    AdminModule,
    StoresModule,
    PurchasesModule,
    PaymentsModule,
    ReservationsModule,
    VouchersModule,
    ClientsModule,
    WalletModule,
    ReturnsModule,
    AuditModule,
    ConversationsModule,
    RefundsModule,
    TasksModule,
    SubscriptionsModule,
    NotificationsModule,
    GeoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
