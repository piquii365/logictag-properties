import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceRequest } from './entities/maintenance-request.entity';
import { MaintenanceRequestEvent } from './entities/maintenance-request-event.entity';
import { MaintenanceAttachment } from './entities/maintenance-attachment.entity';
import { MaintenanceQuote } from './entities/maintenance-quote.entity';
import { MaintenanceJob } from './entities/maintenance-job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaintenanceRequest,
      MaintenanceRequestEvent,
      MaintenanceAttachment,
      MaintenanceQuote,
      MaintenanceJob,
    ]),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
