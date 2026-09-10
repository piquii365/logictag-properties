import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateZimraProfileDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @Matches(/^\d{9}$/, {
    message: 'TIN must be a 9-digit number (e.g. 012345678)',
  })
  tin!: string;

  @IsOptional()
  @IsString()
  taxpayerName?: string;

  @IsString()
  taxpayerType!: string;

  @IsOptional()
  @IsDateString()
  registrationDate?: string;

  @IsOptional()
  @IsBoolean()
  vatRegistered?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  vatNumber?: string;

  @IsOptional()
  @IsBoolean()
  presumptiveRentalRegistered?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  taxYearEndMonth?: number;
}
