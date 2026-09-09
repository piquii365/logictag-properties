import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentVersionDto {
  @IsString()
  @MaxLength(512)
  filePath!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  changeDescription?: string;
}
