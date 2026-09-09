import { IsString, MaxLength, MinLength } from 'class-validator';

export class InitiatePesepayDto {
  @IsString()
  @MinLength(9)
  @MaxLength(16)
  phoneNumber!: string;

  /** One of the `code` values from GET /payments/pesepay/methods. */
  @IsString()
  @MaxLength(32)
  paymentMethodCode!: string;
}
