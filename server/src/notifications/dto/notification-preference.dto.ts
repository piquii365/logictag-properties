import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class NotificationPreferenceDto {
  @IsString()
  @MaxLength(32)
  eventType!: string;

  @IsOptional()
  @IsBoolean()
  receivePush?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveSms?: boolean;

  @IsOptional()
  @IsIn(['immediate', 'daily', 'weekly', 'never'])
  frequency?: string;
}
