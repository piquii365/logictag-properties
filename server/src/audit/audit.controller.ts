import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { seesEverything } from '../common/access';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findAll(@CurrentUser() user: AuthJwtPayload) {
    if (!seesEverything(user)) {
      throw new ForbiddenException('Admin only');
    }
    return this.audit.findAll();
  }
}
