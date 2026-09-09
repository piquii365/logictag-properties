import { IsString, MinLength } from 'class-validator';

export class RejectVendorDto {
  @IsString()
  @MinLength(2)
  reason!: string;
}
