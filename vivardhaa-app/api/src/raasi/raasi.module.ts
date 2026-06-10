import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaasiBatch } from './raasi-batch.entity';
import { RaasiService } from './raasi.service';
import { RaasiController } from './raasi.controller';
import { PurchasesModule } from '../purchases/purchases.module';
import { DestemmingModule } from '../destemming/destemming.module';

@Module({
  imports: [TypeOrmModule.forFeature([RaasiBatch]), PurchasesModule, DestemmingModule],
  providers: [RaasiService],
  controllers: [RaasiController],
  exports: [RaasiService],
})
export class RaasiModule {}
