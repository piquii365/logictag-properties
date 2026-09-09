import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { StatementsService } from './statements.service';

@Controller('properties')
export class StatementsController {
  constructor(private readonly statements: StatementsService) {}

  @Get(':propertyId/statements/:month')
  getStatement(
    @CurrentUser() user: AuthJwtPayload,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('month') month: string,
  ) {
    return this.statements.generate(user, propertyId, month);
  }
}
