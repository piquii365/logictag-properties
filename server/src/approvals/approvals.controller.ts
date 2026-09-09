import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Post()
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateApprovalDto) {
    return this.approvals.create(user, dto);
  }

  @Get('pending')
  findPending(@CurrentUser() user: AuthJwtPayload) {
    return this.approvals.findPending(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.approvals.findOne(user, id);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvals.approve(user, id, dto.notes);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvals.reject(user, id, dto.notes);
  }
}
