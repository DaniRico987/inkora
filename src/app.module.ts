import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { RecaptchaModule } from './recaptcha/recaptcha.module';

@Module({
  imports: [AuthModule, MailModule, RecaptchaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
