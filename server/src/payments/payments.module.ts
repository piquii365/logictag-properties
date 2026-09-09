import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { PaymentAllocation } from './entities/payment-allocation.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { PesepayService } from './pesepay/pesepay.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentAllocation, PaymentWebhookEvent]),
    AccountingModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PesepayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
