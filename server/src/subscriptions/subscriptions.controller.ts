import {
  Body,
  Controller,
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
import { SubscribeDto } from './dto/subscribe.dto';
import { StartTrialDto } from './dto/start-trial.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';

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

  @Get('subscriptions')
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.subscriptions.findAll(user);
  }

  @Post('subscriptions')
  subscribe(@CurrentUser() user: AuthJwtPayload, @Body() dto: SubscribeDto) {
    return this.subscriptions.subscribe(user, dto);
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
