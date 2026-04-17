import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma/prisma.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, StorageModule, NotificationsModule],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}