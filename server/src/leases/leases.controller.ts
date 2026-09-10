import {
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
import { LeasesService } from './leases.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { AddLeaseTenantDto } from './dto/add-lease-tenant.dto';
import { UploadLeaseDocumentDto } from './dto/upload-lease-document.dto';
import { documentMulterOptions } from '../common/multer/multer.config';

@Controller('leases')
export class LeasesController {
  constructor(private readonly leases: LeasesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.leases.findAll(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leases.findOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateLeaseDto) {
    return this.leases.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaseDto,
  ) {
    return this.leases.update(user, id, dto);
  }

  @Patch(':id/activate')
  activate(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leases.activate(user, id);
  }

  @Patch(':id/terminate')
  terminate(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    return this.leases.terminate(user, id, reason);
  }

  @Get(':id/tenants')
  listTenants(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leases.listTenants(user, id);
  }

  @Post(':id/tenants')
  addTenant(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddLeaseTenantDto,
  ) {
    return this.leases.addTenant(user, id, dto);
  }

  @Delete(':id/tenants/:tenantId')
  removeTenant(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.leases.removeTenant(user, id, tenantId);
  }

  @Get(':id/documents')
  listDocuments(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leases.listDocuments(user, id);
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', documentMulterOptions('lease-documents')),
  )
  addDocument(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadLeaseDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.leases.addDocument(user, id, dto.type, file);
  }
}
