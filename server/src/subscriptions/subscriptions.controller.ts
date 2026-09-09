import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { StartTrialDto } from './dto/start-trial.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('subscription-plans')
  listPlans(@CurrentUser() user: AuthJwtPayload) {
    return this.subscriptions.listPlans(user);
  }

  @Post('subscription-plans')
  createPlan(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateSubscriptionPlanDto,
  ) {
    return this.subscriptions.createPlan(user, dto);
  }

  @Patch('subscription-plans/:id')
  updatePlan(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptions.updatePlan(user, id, dto);
  }

  @Delete('subscription-plans/:id')
  removePlan(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptions.removePlan(user, id);
  }

  @Get('subscriptions')
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.subscriptions.findAll(user);
  }

  @Post('subscriptions')
  subscribe(@CurrentUser() user: AuthJwtPayload, @Body() dto: SubscribeDto) {
    return this.subscriptions.subscribe(user, dto);
  }

  /** Admin-only: create a subscription for a specific user. */
  @Post('subscriptions/admin')
  adminCreateSubscription(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptions.adminCreateSubscription(user, dto);
  }

  /** Admin-only: update an existing subscription. */
  @Patch('subscriptions/:id')
  adminUpdateSubscription(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptions.adminUpdateSubscription(user, id, dto);
  }

  /** Admin-only: permanently remove a subscription. */
  @Delete('subscriptions/:id')
  adminRemoveSubscription(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptions.adminRemoveSubscription(user, id);
  }

  @Patch('subscriptions/:id/cancel')
  cancel(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptions.cancel(user, id);
  }

  @Patch('subscriptions/:id/resume')
  resume(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptions.resume(user, id);
  }

  @Get('subscriptions/:id/payments')
  listPayments(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptions.listPayments(user, id);
  }

  /** Admin-only: all subscription payments across every account. */
  @Get('subscription-payments')
  listAllPayments(@CurrentUser() user: AuthJwtPayload) {
    return this.subscriptions.listAllPayments(user);
  }

  @Post('subscriptions/:id/payments')
  recordPayment(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptions.recordPayment(user, id);
  }

  @Patch('subscriptions/:id/change-plan')
  changePlan(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      planId: string;
      agreedPricePerUnitMinor?: string;
      provider?: 'pesepay';
    },
  ) {
    return this.subscriptions.changePlan(user, id, dto);
  }

  @Patch('subscription-payments/:id/succeed')
  markSucceeded(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptions.markPaymentStatus(user, id, 'succeeded');
  }

  @Patch('subscription-payments/:id/fail')
  markFailed(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscriptions.markPaymentStatus(user, id, 'failed');
  }

  @Get('trials')
  findAllTrials(@CurrentUser() user: AuthJwtPayload) {
    return this.subscriptions.findAllTrials(user);
  }

  @Post('trials')
  startTrial(@CurrentUser() user: AuthJwtPayload, @Body() dto: StartTrialDto) {
    return this.subscriptions.startTrial(user, dto);
  }
}
