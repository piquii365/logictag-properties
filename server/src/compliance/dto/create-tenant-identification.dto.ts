import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateTenantIdentificationDto {
  @IsString()
  @MaxLength(32)
  idType!: string;

  @IsString()
  @MaxLength(64)
  idNumber!: string;

  @IsOptional()
  @IsDateString()
  idIssueDate?: string;

  @IsOptional()
  @IsDateString()
  idExpiryDate?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  issuingCountry?: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;
}
