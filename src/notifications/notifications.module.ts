import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}