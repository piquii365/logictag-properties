import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  PasskeyLoginOptionsDto,
  PasskeyLoginVerifyDto,
  PasskeyRegisterVerifyDto,
} from './dto/passkey.dto';
import type { AuthJwtPayload } from './types/jwt-payload.auth';

const REFRESH_COOKIE = 'refresh_token';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth/passkey')
export class PasskeyController {
  constructor(
    private readonly passkeys: PasskeyService,
    private readonly authService: AuthService,
  ) {}

  /** Public key creation options for adding a passkey to the current account. */
  @Post('register/options')
  @HttpCode(HttpStatus.OK)
  registerOptions(@CurrentUser() user: AuthJwtPayload) {
    return this.passkeys.registrationOptions(user);
  }

  /** Verify the attestation and store the credential. */
  @Post('register/verify')
  @HttpCode(HttpStatus.CREATED)
  registerVerify(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: PasskeyRegisterVerifyDto,
  ) {
    return this.passkeys.verifyRegistration(user, dto);
  }

  /** Public key request options for signing in. Email is optional. */
  @Public()
  @Post('login/options')
  @HttpCode(HttpStatus.OK)
  loginOptions(@Body() dto: PasskeyLoginOptionsDto) {
    return this.passkeys.authenticationOptions(dto.email);
  }

  /** Verify the assertion and issue a session. */
  @Public()
  @Post('login/verify')
  @HttpCode(HttpStatus.OK)
  async loginVerify(
    @Body() dto: PasskeyLoginVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = await this.passkeys.verifyAuthentication(dto);
    const profile = await this.authService.getProfile(payload.id);
    const session = await this.authService.login(
      payload.id,
      profile.name,
      profile.email,
      profile.role,
    );
    res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions);
    return session.body;
  }

  /** Passkeys registered to the signed-in user. */
  @Get()
  list(@CurrentUser() user: AuthJwtPayload) {
    return this.passkeys.list(user);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthJwtPayload, @Param('id') id: string) {
    return this.passkeys.remove(user, id);
  }
}
