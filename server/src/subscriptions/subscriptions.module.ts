import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { Trial } from './entities/trial.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Unit } from '../properties/entities/unit.entity';
import { Property } from '../properties/entities/property.entity';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      SubscriptionPlan,
      Subscription,
      SubscriptionPayment,
      Trial,
      Unit,
      Property,
    ]),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
