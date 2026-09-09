import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVendorServiceAreaDto {
  @IsString()
  @MaxLength(120)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  suburb?: string;
}
