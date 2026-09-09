import { Controller, Get, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('properties/:propertyId.pdf')
  async propertyPdf(
    @CurrentUser() user: AuthJwtPayload,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Res() response: Response,
  ) {
    const pdf = await this.reports.propertyPdf(user, propertyId);
    response
      .type('application/pdf')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="property-${propertyId}.pdf"`,
      )
      .send(pdf);
  }
}
