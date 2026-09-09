import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateRentChargeDto } from './dto/create-rent-charge.dto';
import { CreateRentScheduleDto } from './dto/create-rent-schedule.dto';
import { VoidChargeDto } from './dto/void-charge.dto';
import { CreateChargeAdjustmentDto } from './dto/create-charge-adjustment.dto';

@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('leases/:leaseId/rent-schedule')
  listSchedules(
    @CurrentUser() user: AuthJwtPayload,
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
  ) {
    return this.billing.listSchedules(user, leaseId);
  }

  @Post('leases/:leaseId/rent-schedule')
  createSchedule(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateRentScheduleDto,
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
  ) {
    return this.billing.createSchedule(user, { ...dto, leaseId });
  }

  @Post('leases/:leaseId/rent-schedule/generate')
  generateCharges(
    @CurrentUser() user: AuthJwtPayload,
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @Body() body: { startDate: string; endDate: string },
  ) {
    return this.billing.generateChargesForLease(
      user,
      leaseId,
      body.startDate,
      body.endDate,
    );
  }

  @Get('rent-charges')
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.billing.findAll(user);
  }

  @Get('rent-charges/:id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billing.findOne(user, id);
  }

  @Post('rent-charges')
  create(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateRentChargeDto,
  ) {
    return this.billing.create(user, dto);
  }

  @Patch('rent-charges/:id/void')
  void(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidChargeDto,
  ) {
    return this.billing.void(user, id, dto.reason);
  }

  @Get('charge-adjustments')
  listAdjustments(
    @CurrentUser() user: AuthJwtPayload,
    @Query('adjustableId', ParseUUIDPipe) adjustableId: string,
  ) {
    return this.billing.listAdjustments(user, adjustableId);
  }

  @Post('charge-adjustments')
  createAdjustment(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateChargeAdjustmentDto,
  ) {
    return this.billing.createAdjustment(user, dto);
  }
}
