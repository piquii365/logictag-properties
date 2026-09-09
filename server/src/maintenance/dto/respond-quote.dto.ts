import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RespondQuoteDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
