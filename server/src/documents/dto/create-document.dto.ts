import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(32)
  documentType!: string;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(512)
  filePath!: string;

  @IsString()
  @MaxLength(64)
  mimeType!: string;

  @IsInt()
  @Min(0)
  fileSize!: number;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}
