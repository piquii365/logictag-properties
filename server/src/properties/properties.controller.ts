import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PropertiesService } from './properties.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { AssignTenantDto } from './dto/assign-tenant.dto';
import { multerOptions } from '../common/multer/multer.config';

/**
 * Every handler passes the caller into the service; the service is the only
 * place that decides what they can see. No route filters on its own.
 */
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.properties.findAll(user);
  }

  /** Units the caller can see across all properties (a tenant's own units). */
  @Get('units')
  findMyUnits(@CurrentUser() user: AuthJwtPayload) {
    return this.properties.findMyUnits(user);
  }

  @Get('units/:unitId')
  findUnit(
    @CurrentUser() user: AuthJwtPayload,
    @Param('unitId', ParseUUIDPipe) unitId: string,
  ) {
    return this.properties.findUnit(user, unitId);
  }

  @Patch('units/:unitId/tenant')
  assignTenant(
    @CurrentUser() user: AuthJwtPayload,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: AssignTenantDto,
  ) {
    return this.properties.assignTenant(user, unitId, dto);
  }

  @Patch('units/:unitId')
  updateUnit(
    @CurrentUser() user: AuthJwtPayload,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.properties.updateUnit(user, unitId, dto);
  }

  @Post()
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreatePropertyDto) {
    return this.properties.create(user, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.properties.findOne(user, id);
  }

  @Get(':id/units')
  findUnits(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.properties.findUnits(user, id);
  }

  @Post(':id/units')
  createUnit(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.properties.createUnit(user, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.properties.update(user, id, dto);
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', multerOptions('properties')))
  addImage(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.properties.addImage(user, id, file);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.properties.remove(user, id);
  }
}
