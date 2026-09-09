import { IsUUID } from 'class-validator';

export class AssignVendorDto {
  @IsUUID()
  vendorId!: string;
}
