import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeasesService } from './leases.service';
import { LeasesController } from './leases.controller';
import { Lease } from './entities/lease.entity';
import { LeaseTenant } from './entities/lease-tenant.entity';
import { LeaseDocument } from './entities/lease-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lease, LeaseTenant, LeaseDocument])],
  controllers: [LeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}
