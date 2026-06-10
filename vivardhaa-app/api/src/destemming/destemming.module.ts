import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestemmingJob } from './destemming-job.entity';
import { DestemmingService } from './destemming.service';
import { DestemmingController } from './destemming.controller';
import { PurchasesModule } from '../purchases/purchases.module';

@Module({
  imports: [TypeOrmModule.forFeature([DestemmingJob]), PurchasesModule],
  providers: [DestemmingService],
  controllers: [DestemmingController],
  exports: [DestemmingService],
})
export class DestemmingModule {}
