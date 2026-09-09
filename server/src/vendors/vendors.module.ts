import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { Vendor } from './entities/vendor.entity';
import { Service } from './entities/service.entity';
import { VendorService } from './entities/vendor-service.entity';
import { VendorServiceArea } from './entities/vendor-service-area.entity';
import { VendorRating } from './entities/vendor-rating.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vendor,
      Service,
      VendorService,
      VendorServiceArea,
      VendorRating,
    ]),
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
