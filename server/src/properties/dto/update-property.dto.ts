import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePropertyDto } from './create-property.dto';
import { IsBoolean, IsOptional } from 'class-validator';

// ownerId is omitted: transferring a property is not an edit.
export class UpdatePropertyDto extends PartialType(
  OmitType(CreatePropertyDto, ['ownerId'] as const),
) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
