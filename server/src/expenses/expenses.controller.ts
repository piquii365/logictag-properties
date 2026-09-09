import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthJwtPayload,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.expenses.findAll(user, propertyId);
  }

  @Get('by-category')
  byCategory(
    @CurrentUser() user: AuthJwtPayload,
    @Query('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.expenses.byCategory(user, propertyId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenses.findOne(user, id);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenses.approve(user, id);
  }

  @Post(':id/reverse')
  reverse(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.expenses.reverse(user, id, reason);
  }
}
