import {
  Controller,
  Get,
  Body,
  Patch,
  Post,
  Param,
  ParseUUIDPipe,
  Delete,
  ForbiddenException,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetRoleDto } from './dto/set-role.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/role.decorator';
import type { AuthJwtPayload } from '../auth/types/jwt-payload.auth';
import { UserRole } from '../auth/enums/role.enum';
import { multerOptions } from '../common/multer/multer.config';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UsersService) {}

  // Account creation is POST /auth/register. There is no unauthenticated
  // POST /users, because it accepted a `role` and let anyone mint an admin.

  @Get()
  findAll(@CurrentUser() user: AuthJwtPayload) {
    return this.userService.findAll(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.assertSelfOrAdmin(user, id);
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.assertSelfOrAdmin(user, id);
    return this.userService.update(id, updateUserDto);
  }

  /** Role changes are an admin action, never a self-service field. */
  @Roles(UserRole.ADMIN)
  @Patch(':id/role')
  setRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRoleDto) {
    return this.userService.setRole(id, dto.role);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file', multerOptions('avatars')))
  uploadAvatar(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    this.assertSelfOrAdmin(user, id);
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.userService.updateAvatar(id, file);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.assertSelfOrAdmin(user, id);
    return this.userService.remove(id);
  }

  private assertSelfOrAdmin(user: AuthJwtPayload, id: string) {
    if (user.id !== id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only access your own account');
    }
  }
}
