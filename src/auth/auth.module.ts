import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma/prisma.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailModule } from '../mail/mail.module';
import { RecaptchaModule } from '../recaptcha/recaptcha.module';

@Module({
  imports: [PrismaModule, ConfigModule, MailModule, RecaptchaModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
