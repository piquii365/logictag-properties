import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { seesEverything } from '../common/access';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { ComplianceService } from './compliance.service';
import { ForbiddenException } from '@nestjs/common';

@Controller('compliance/tax-rules')
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get()
  list(@Query('taxType') taxType?: string) {
    return this.compliance.listRules(taxType);
  }

  @Get('lookup')
  lookup(@Query('taxType') taxType: string, @Query('date') date: string) {
    return this.compliance.getRuleForDate(taxType, date);
  }

  @Post()
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateTaxRuleDto) {
    if (!seesEverything(user)) throw new ForbiddenException('Admin only');
    return this.compliance.createRule(dto);
  }
}
