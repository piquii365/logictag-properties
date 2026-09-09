import { IsString, MinLength } from 'class-validator';

export class VoidChargeDto {
  @IsString()
  @MinLength(2)
  reason!: string;
}
