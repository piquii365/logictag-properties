import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ReplyNotificationDto } from './dto/reply-notification.dto';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthJwtPayload) {
    return this.notifications.list(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notifications.create(user, dto);
  }

  /** Management: candidate tenant/vendor users they can message. */
  @Get('recipients')
  listRecipients(@CurrentUser() user: AuthJwtPayload) {
    return this.notifications.listRecipients(user);
  }

  /** Management: send a notice to a chosen set of recipients. */
  @Post('send')
  sendToMany(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: SendNotificationDto,
  ) {
    return this.notifications.sendToMany(user, dto);
  }

  /** Tenant/vendor: message management. */
  @Post('reply')
  replyToManagement(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: ReplyNotificationDto,
  ) {
    return this.notifications.replyToManagement(user, dto);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(user, id);
  }

  @Get('preferences')
  listPreferences(@CurrentUser() user: AuthJwtPayload) {
    return this.notifications.listPreferences(user);
  }

  @Post('preferences')
  setPreference(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: NotificationPreferenceDto,
  ) {
    return this.notifications.setPreference(user, dto);
  }
}
