import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { CreatePaymentAllocationDto } from './dto/create-payment-allocation.dto';
import { InitiatePesepayDto } from './dto/initiate-pesepay.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payments')
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.payments.findAll(user);
  }

  @Get('payments/webhook-events')
  listWebhookEvents(@CurrentUser() user: AuthJwtPayload) {
    return this.payments.listWebhookEvents(user);
  }

  @Get('payments/pesepay/methods')
  getPesepayMethods(@Query('currency') currency = 'USD') {
    return this.payments.getPesepayMethods(currency);
  }

  /** PesePay's resultUrl webhook target. We don't act on it — the mobile
   * client polls GET /payments/:id/pesepay/status instead, which works
   * without this server needing to be publicly reachable — but PesePay
   * still requires a resultUrl to accept the request, so this just has to
   * answer 200. */
  @Public()
  @Post('payments/pesepay/result')
  @HttpCode(HttpStatus.OK)
  pesepayResult() {
    return { received: true };
  }

  @Get('payments/:id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.findOne(user, id);
  }

  @Post('payments')
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreatePaymentDto) {
    return this.payments.create(user, dto);
  }

  @Patch('payments/:id/status')
  updateStatus(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.payments.updateStatus(user, id, dto);
  }

  @Post('payments/:id/pesepay/initiate')
  initiatePesepay(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InitiatePesepayDto,
  ) {
    return this.payments.initiatePesepay(user, id, dto);
  }

  @Get('payments/:id/pesepay/status')
  checkPesepayStatus(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.checkPesepayStatus(user, id);
  }

  @Get('payments/:id/allocations')
  listAllocations(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.listAllocations(user, id);
  }

  @Patch('payments/:id/allocate')
  autoAllocate(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.autoAllocate(user, id);
  }

  @Post('payment-allocations')
  createAllocation(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: CreatePaymentAllocationDto,
  ) {
    return this.payments.createAllocation(user, dto);
  }
}
