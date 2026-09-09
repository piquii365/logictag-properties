import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { RejectVendorDto } from './dto/reject-vendor.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { CreateVendorServiceDto } from './dto/create-vendor-service.dto';
import { CreateVendorServiceAreaDto } from './dto/create-vendor-service-area.dto';
import { CreateVendorRatingDto } from './dto/create-vendor-rating.dto';

@Controller()
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get('services')
  listServices() {
    return this.vendors.listServices();
  }

  @Post('services')
  createService(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateServiceDto,
  ) {
    return this.vendors.createService(user, dto);
  }

  @Get('vendors')
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.vendors.findAll(user);
  }

  @Get('vendors/:id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vendors.findOne(user, id);
  }

  @Post('vendors')
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateVendorDto) {
    return this.vendors.create(user, dto);
  }

  @Patch('vendors/:id')
  update(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendors.update(user, id, dto);
  }

  @Patch('vendors/:id/approve')
  approve(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vendors.approve(user, id);
  }

  @Patch('vendors/:id/reject')
  reject(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectVendorDto,
  ) {
    return this.vendors.reject(user, id, dto);
  }

  @Patch('vendors/:id/suspend')
  suspend(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vendors.suspend(user, id);
  }

  @Get('vendors/:id/services')
  listVendorServices(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendors.listVendorServices(id);
  }

  @Post('vendors/:id/services')
  addVendorService(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVendorServiceDto,
  ) {
    return this.vendors.addVendorService(user, id, dto);
  }

  @Delete('vendors/:id/services/:serviceId')
  removeVendorService(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.vendors.removeVendorService(user, id, serviceId);
  }

  @Get('vendors/:id/areas')
  listServiceAreas(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendors.listServiceAreas(id);
  }

  @Post('vendors/:id/areas')
  addServiceArea(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVendorServiceAreaDto,
  ) {
    return this.vendors.addServiceArea(user, id, dto);
  }

  @Get('vendors/:id/ratings')
  listRatings(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendors.listRatings(id);
  }

  @Post('vendors/:id/ratings')
  rate(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVendorRatingDto,
  ) {
    return this.vendors.rate(user, id, dto);
  }
}
