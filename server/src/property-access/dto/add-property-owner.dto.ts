import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AddPropertyOwnerDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ownershipShare?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
