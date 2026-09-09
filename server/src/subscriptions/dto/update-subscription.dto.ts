import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionDto } from './create-subscription.dto';

/** Admin-only: update an existing subscription (plan, status, periods, etc.). */
export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {}
