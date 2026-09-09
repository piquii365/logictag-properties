import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../properties/entities/property.entity';
import { RentCharge } from '../billing/entities/rent-charge.entity';
import { PaymentAllocation } from '../payments/entities/payment-allocation.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      RentCharge,
      PaymentAllocation,
      Payment,
      Expense,
    ]),
  ],
  controllers: [StatementsController],
  providers: [StatementsService],
  exports: [StatementsService],
})
export class StatementsModule {}
