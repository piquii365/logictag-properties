import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { AiService } from './ai.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { seesEverything } from '../common/access';

@Controller()
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('ai-insights')
  findAllInsights(@CurrentUser() user: AuthJwtPayload) {
    this.assertReadable(user);
    return this.ai.findAllInsights();
  }

  @Get('ai-request-logs')
  findAllRequestLogs(@CurrentUser() user: AuthJwtPayload) {
    this.assertReadable(user);
    return this.ai.findAllRequestLogs();
  }

  @Get('ai/financial-summary')
  financialSummary(
    @CurrentUser() user: AuthJwtPayload,
    @Query('currency') currency = 'USD',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.assertReadable(user);
    return this.ai.financialSummary(currency, from, to);
  }

  @Get('ai/recommendations')
  recommendations(
    @CurrentUser() user: AuthJwtPayload,
    @Query('currency') currency = 'USD',
  ) {
    this.assertReadable(user);
    return this.ai.recommendations(currency);
  }

  @Get('ai/predictions')
  predictions(
    @CurrentUser() user: AuthJwtPayload,
    @Query('currency') currency = 'USD',
  ) {
    this.assertReadable(user);
    return this.ai.predictions(currency);
  }

  @Get('ai/expense-benchmark')
  benchmarkExpenses(
    @CurrentUser() user: AuthJwtPayload,
    @Query('currency') currency = 'USD',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.assertReadable(user);
    return this.ai.benchmarkExpenses(currency, from, to);
  }

  @Get('ai/explain')
  explainMetric(
    @CurrentUser() user: AuthJwtPayload,
    @Query('metric') metric: string,
    @Query('currency') currency = 'USD',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.assertReadable(user);
    return this.ai.explainMetric(metric, currency, from, to);
  }

  private assertAdmin(user: AuthJwtPayload) {
    if (!seesEverything(user)) {
      throw new ForbiddenException('Admin only');
    }
  }

  private assertReadable(user: AuthJwtPayload) {
    void user;
  }
}
