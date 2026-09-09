import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PropertyAccessService } from './property-access.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { AddPropertyOwnerDto } from './dto/add-property-owner.dto';
import { AddPropertyUserDto } from './dto/add-property-user.dto';

@Controller('properties/:propertyId')
export class PropertyAccessController {
  constructor(private readonly access: PropertyAccessService) {}

  @Get('owners')
  listOwners(
    @CurrentUser() user: AuthJwtPayload,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.access.listOwners(user, propertyId);
  }

  @Post('owners')
  addOwner(
    @CurrentUser() user: AuthJwtPayload,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: AddPropertyOwnerDto,
  ) {
    return this.access.addOwner(user, propertyId, dto);
  }

  @Delete('owners/:userId')
  removeOwner(
    @CurrentUser() user: AuthJwtPayload,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.access.removeOwner(user, propertyId, userId);
  }

  @Get('users')
  listUsers(
    @CurrentUser() user: AuthJwtPayload,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.access.listUsers(user, propertyId);
  }

  @Post('users')
  addUser(
    @CurrentUser() user: AuthJwtPayload,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: AddPropertyUserDto,
  ) {
    return this.access.addUser(user, propertyId, dto);
  }

  @Delete('users/:userId')
  removeUser(
    @CurrentUser() user: AuthJwtPayload,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.access.removeUser(user, propertyId, userId);
  }
}
