import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyAccessService } from './property-access.service';
import { PropertyAccessController } from './property-access.controller';
import { PropertyOwner } from './entities/property-owner.entity';
import { PropertyUser } from './entities/property-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyOwner, PropertyUser])],
  controllers: [PropertyAccessController],
  providers: [PropertyAccessService],
  exports: [PropertyAccessService],
})
export class PropertyAccessModule {}
