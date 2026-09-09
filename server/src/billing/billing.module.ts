import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { RentCharge } from './entities/rent-charge.entity';
import { ChargeAdjustment } from './entities/charge-adjustment.entity';
import { RentSchedule } from './entities/rent-schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RentCharge, ChargeAdjustment, RentSchedule]),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
