import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { AuthService, AuthSessionResponse } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth/refresh-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth/google-oauth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { AuthJwtPayload } from './types/jwt-payload.auth';

const REFRESH_COOKIE = 'refresh_token';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  // Scoped to the refresh route so it is not attached to every request.
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.issue(res, await this.authService.register(dto));
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @CurrentUser() user: AuthJwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = await this.authService.getProfile(user.id);
    return this.issue(
      res,
      await this.authService.login(
        user.id,
        profile.name,
        user.email,
        user.role,
      ),
    );
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: AuthJwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = await this.authService.getProfile(user.id);
    return this.issue(
      res,
      await this.authService.refreshToken(
        user.id,
        profile.name,
        user.email,
        user.role,
      ),
    );
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgetPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.email,
      dto.token,
      dto.newPassword,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthJwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.signOut(user.id);
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return { message: 'Signed out successfully' };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthJwtPayload) {
    return this.authService.getProfile(user.id);
  }

  // ── Google OAuth ──────────────────────────────────────────────

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  googleAuth() {
    // Guard redirects to Google — no implementation needed
  }

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google/callback')
  async googleAuthCallback(
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ) {
    const session = await this.authService.handleOAuthLogin(user.id);
    res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions);
    const target = new URL(
      '/auth/callback',
      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    );
    target.searchParams.set('accessToken', session.body.accessToken);
    return res.redirect(target.toString());
  }

  /** Refresh token goes in an httpOnly cookie, never in the JSON body. */
  private issue(res: Response, session: AuthSessionResponse) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions);
    return session.body;
  }
}
