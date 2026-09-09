import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { IsMinorAmount } from '../../common/validators/is-minor-amount.decorator';
import { ExpenseCategory } from '../entities/expense.entity';

export class CreateExpenseDto {
  @IsUUID()
  propertyId!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsString()
  @MaxLength(255)
  description!: string;

  @IsMinorAmount()
  amountMinor!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsBoolean()
  billableToTenant?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  invoiceNumber?: string;
}
