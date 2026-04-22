import { Module } from '@nestjs/common';
import { PrismaModule } from 'prisma/prisma/prisma.module';
import { StoresAvailabilityController } from './stores-availability.controller';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

@Module({
  imports: [PrismaModule],
  controllers: [StoresController, StoresAvailabilityController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule { }

