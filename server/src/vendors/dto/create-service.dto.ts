import { IsString, MaxLength } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @MaxLength(80)
  slug!: string;

  @IsString()
  @MaxLength(40)
  category!: string;
}
