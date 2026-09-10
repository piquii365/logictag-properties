import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Management → selected recipients. `userIds` are the tenant/vendor users
 * the sender picked from the recipients list. */
export class SendNotificationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  userIds!: string[];

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
