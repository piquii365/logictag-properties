import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { seesEverything } from '../common/access';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findAll(@CurrentUser() user: AuthJwtPayload, @Query() query: AuditQueryDto) {
    if (!seesEverything(user)) {
      throw new ForbiddenException('Admin only');
    }
    return this.audit.query(query);
  }
}
