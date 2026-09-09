import { IsString, MaxLength } from 'class-validator';

export class UploadLeaseDocumentDto {
  @IsString()
  @MaxLength(32)
  type!: string;
}
