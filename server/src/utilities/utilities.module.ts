import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilitiesService } from './utilities.service';
import { UtilitiesController } from './utilities.controller';
import { Utility } from './entities/utility.entity';
import { UtilityRate } from './entities/utility-rate.entity';
import { Meter } from './entities/meter.entity';
import { MeterReading } from './entities/meter-reading.entity';
import { UtilityCharge } from './entities/utility-charge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Utility,
      UtilityRate,
      Meter,
      MeterReading,
      UtilityCharge,
    ]),
  ],
  controllers: [UtilitiesController],
  providers: [UtilitiesService],
  exports: [UtilitiesService],
})
export class UtilitiesModule {}
