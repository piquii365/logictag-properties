import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(160)
  contactName!: string;

  @IsString()
  @MaxLength(32)
  contactPhone!: string;

  @IsEmail()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  suburb?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
