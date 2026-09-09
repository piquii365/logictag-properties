import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { UtilitiesService } from './utilities.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { CreateUtilityRateDto } from './dto/create-utility-rate.dto';
import { CreateMeterDto } from './dto/create-meter.dto';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { CreateUtilityChargeDto } from './dto/create-utility-charge.dto';

@Controller()
export class UtilitiesController {
  constructor(private readonly utilities: UtilitiesService) {}

  @Get('utilities')
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.utilities.findAll(user);
  }

  @Get('utilities/:id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.utilities.findOne(user, id);
  }

  @Post('utilities')
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateUtilityDto) {
    return this.utilities.create(user, dto);
  }

  @Get('utilities/:id/rates')
  listRates(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.utilities.listRates(user, id);
  }

  @Post('utilities/:id/rates')
  addRate(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateUtilityRateDto,
  ) {
    return this.utilities.addRate(user, id, dto);
  }

  @Get('meters')
  listMeters(@CurrentUser() user: AuthJwtPayload) {
    return this.utilities.listMeters(user);
  }

  @Post('meters')
  createMeter(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateMeterDto,
  ) {
    return this.utilities.createMeter(user, dto);
  }

  @Get('meters/:id/readings')
  listReadings(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.utilities.listReadings(user, id);
  }

  @Post('meters/:id/readings')
  addReading(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMeterReadingDto,
  ) {
    return this.utilities.addReading(user, id, dto);
  }

  @Get('utility-charges')
  findAllCharges(@CurrentUser() user: AuthJwtPayload) {
    return this.utilities.findAllCharges(user);
  }

  @Get('utility-charges/:id')
  findOneCharge(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.utilities.findOneCharge(user, id);
  }

  @Post('utility-charges')
  createCharge(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateUtilityChargeDto,
  ) {
    return this.utilities.createCharge(user, dto);
  }
}
