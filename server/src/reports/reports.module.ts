import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../properties/entities/property.entity';
import { Unit } from '../properties/entities/unit.entity';
import { RentCharge } from '../billing/entities/rent-charge.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property, Unit, RentCharge])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
