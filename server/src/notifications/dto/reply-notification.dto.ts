import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Tenant/vendor → management. Recipients (all management users) are resolved
 * server-side, so the sender only supplies the message. */
export class ReplyNotificationDto {
  @IsString()
  @MaxLength(32)
  eventType!: string;

  @IsString()
  @MaxLength(255)
  subject!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}
