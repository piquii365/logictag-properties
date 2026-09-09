import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceController } from './compliance.controller';
import { ComplianceOperationsController } from './compliance-operations.controller';
import { ComplianceService } from './compliance.service';
import { TaxRule } from './entities/tax-rule.entity';
import { ZimraProfile } from './entities/zimra-profile.entity';
import { TenantIdentification } from './entities/tenant-identification.entity';
import { TaxObligation } from './entities/tax-obligation.entity';
import { TaxReturn } from './entities/tax-return.entity';
import { TaxReturnLine } from './entities/tax-return-line.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaxRule,
      ZimraProfile,
      TenantIdentification,
      TaxObligation,
      TaxReturn,
      TaxReturnLine,
    ]),
  ],
  controllers: [ComplianceController, ComplianceOperationsController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
