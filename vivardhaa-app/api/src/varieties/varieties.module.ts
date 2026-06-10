import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Variety } from './variety.entity';
import { Mark } from './mark.entity';
import { VarietiesService } from './varieties.service';
import { VarietiesController } from './varieties.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Variety, Mark])],
  providers: [VarietiesService],
  controllers: [VarietiesController],
  exports: [VarietiesService],
})
export class VarietiesModule {}
