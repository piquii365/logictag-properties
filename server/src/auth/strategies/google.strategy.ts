/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '../../config/config.service';
import { UsersService } from '../../users/users.service';
import { AuthProvider } from '../enums/auth-provider.enum';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
    private readonly userService: UsersService,
  ) {
    super({
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
      scope: ['profile', 'email'],
    });
  }
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const user = await this.userService.findOrCreateOAuthUser({
        provider: AuthProvider.GOOGLE,
        providerId: profile.id,
        email: profile.emails?.[0]?.value ?? '',
        displayName: profile.displayName ?? '',
        firstName:
          profile.name?.givenName ?? profile.displayName?.split(' ')[0] ?? '',
        lastName:
          profile.name?.familyName ??
          profile.displayName?.split(' ').slice(1).join(' ') ??
          '',
        avatarUrl: profile.photos?.[0]?.value ?? '',
      });
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
