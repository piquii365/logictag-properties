import {
  IsDateString,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class GenerateTaxReturnDto {
  @IsUUID()
  zimraProfileId!: string;

  @IsString()
  @MaxLength(32)
  taxType!: string;

  @IsDateString()
  taxPeriodStart!: string;

  @IsDateString()
  taxPeriodEnd!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;
}
