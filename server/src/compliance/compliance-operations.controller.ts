import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { documentMulterOptions } from '../common/multer/multer.config';
import { CreateTenantIdentificationDto } from './dto/create-tenant-identification.dto';
import { CreateTaxObligationDto } from './dto/create-tax-obligation.dto';
import { CreateZimraProfileDto } from './dto/create-zimra-profile.dto';
import { GenerateTaxReturnDto } from './dto/generate-tax-return.dto';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceOperationsController {
  constructor(private readonly compliance: ComplianceService) {}

  @Post('zimra/profiles')
  createProfile(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateZimraProfileDto,
  ) {
    return this.compliance.createProfile(user, dto);
  }

  @Get('zimra/profiles')
  listProfiles(@CurrentUser() user: AuthJwtPayload) {
    return this.compliance.listProfiles(user);
  }

  @Post('zimra/profiles/:id/documents')
  @UseInterceptors(FileInterceptor('file', documentMulterOptions('compliance')))
  uploadProfileDocument(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.compliance.uploadProfileDocument(user, id, file);
  }

  @Delete('zimra/profiles/:id/documents/:documentId')
  removeProfileDocument(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.compliance.removeProfileDocument(user, id, documentId);
  }

  @Post('tenants/:tenantId/identification')
  saveIdentification(
    @CurrentUser() user: AuthJwtPayload,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: CreateTenantIdentificationDto,
  ) {
    return this.compliance.saveTenantIdentification(user, tenantId, dto);
  }

  @Get('tenants/:tenantId/identification')
  getIdentification(
    @CurrentUser() user: AuthJwtPayload,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.compliance.getTenantIdentification(user, tenantId);
  }

  @Patch('tenants/:tenantId/identification/verify')
  verifyIdentification(
    @CurrentUser() user: AuthJwtPayload,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ) {
    return this.compliance.verifyTenantIdentification(user, tenantId);
  }

  @Post('tax-obligations')
  createObligation(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateTaxObligationDto,
  ) {
    return this.compliance.createObligation(user, dto);
  }

  @Get('tax-obligations')
  listObligations(
    @CurrentUser() user: AuthJwtPayload,
    @Query('profileId') profileId?: string,
  ) {
    return this.compliance.listObligations(user, profileId);
  }

  @Post('tax-returns/generate')
  generateTaxReturn(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: GenerateTaxReturnDto,
  ) {
    return this.compliance.generateTaxReturn(user, dto);
  }

  @Get('tax-returns')
  listTaxReturns(
    @CurrentUser() user: AuthJwtPayload,
    @Query('profileId') profileId?: string,
  ) {
    return this.compliance.listTaxReturns(user, profileId);
  }

  @Get('tax-returns/:id')
  getTaxReturn(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.compliance.getTaxReturn(user, id);
  }

  @Get('tax-returns/:id.pdf')
  async downloadTaxReturnPdf(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const pdf = await this.compliance.getTaxReturnPdf(user, id);
    response
      .type('application/pdf')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="tax-return-${id}.pdf"`,
      )
      .send(pdf);
  }
}
