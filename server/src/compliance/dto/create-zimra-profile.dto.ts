import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateZimraProfileDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsString()
  @Max(32)
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
