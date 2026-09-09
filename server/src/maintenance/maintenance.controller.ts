import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaintenanceService } from './maintenance.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { AssignVendorDto } from './dto/assign-vendor.dto';
import { CreateMaintenanceQuoteDto } from './dto/create-maintenance-quote.dto';
import { RespondQuoteDto } from './dto/respond-quote.dto';
import { CreateMaintenanceJobDto } from './dto/create-maintenance-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { AttachableRefDto } from './dto/attachable-ref.dto';
import { documentMulterOptions } from '../common/multer/multer.config';

@Controller()
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get('maintenance-requests')
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.maintenance.findAll(user);
  }

  @Get('maintenance-requests/:id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenance.findOne(user, id);
  }

  @Post('maintenance-requests')
  create(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateMaintenanceRequestDto,
  ) {
    return this.maintenance.create(user, dto);
  }

  @Patch('maintenance-requests/:id/status')
  updateStatus(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.maintenance.updateStatus(user, id, dto);
  }

  @Patch('maintenance-requests/:id/assign-vendor')
  assignVendor(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignVendorDto,
  ) {
    return this.maintenance.assignVendor(user, id, dto);
  }

  @Get('maintenance-requests/:id/events')
  listEvents(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenance.listEvents(user, id);
  }

  @Get('maintenance-requests/:id/quotes')
  listQuotes(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenance.listQuotes(user, id);
  }

  @Post('maintenance-requests/:id/quotes')
  createQuote(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenanceQuoteDto,
  ) {
    return this.maintenance.createQuote(user, id, dto);
  }

  @Patch('maintenance-quotes/:id/respond')
  respondQuote(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondQuoteDto,
  ) {
    return this.maintenance.respondQuote(user, id, dto);
  }

  @Get('maintenance-requests/:id/jobs')
  listJobs(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenance.listJobs(user, id);
  }

  @Post('maintenance-requests/:id/jobs')
  createJob(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenanceJobDto,
  ) {
    return this.maintenance.createJob(user, id, dto);
  }

  @Patch('maintenance-jobs/:id/status')
  updateJobStatus(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.maintenance.updateJobStatus(user, id, dto);
  }

  @Get('maintenance-attachments')
  listAttachments(
    @CurrentUser() user: AuthJwtPayload,
    @Query() query: AttachableRefDto,
  ) {
    return this.maintenance.listAttachments(
      user,
      query.attachableType,
      query.attachableId,
    );
  }

  @Post('maintenance-attachments')
  @UseInterceptors(
    FileInterceptor('file', documentMulterOptions('maintenance-attachments')),
  )
  addAttachment(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: AttachableRefDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.maintenance.addAttachment(
      user,
      dto.attachableType,
      dto.attachableId,
      file,
    );
  }
}
