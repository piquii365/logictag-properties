import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { SystemService } from './system.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { seesEverything } from '../common/access';

@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthJwtPayload) {
    if (!seesEverything(user)) {
      throw new ForbiddenException('Admin only');
    }
    return this.system.overview();
  }
}
