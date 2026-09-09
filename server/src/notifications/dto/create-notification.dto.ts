import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  userId!: string;

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
