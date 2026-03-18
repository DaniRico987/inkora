import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BooksModule } from '../books/books.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, AuthModule, BooksModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

