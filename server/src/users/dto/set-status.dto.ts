import { IsEnum } from 'class-validator';
import { UserStatus } from '../enums/status.enum';

export class SetStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}
