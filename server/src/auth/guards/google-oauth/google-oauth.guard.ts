import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isGoogleOAuthConfigured } from '../../config/google-oauth.enabled';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    // GoogleStrategy is only registered when credentials exist, so without
    // them passport would throw "Unknown authentication strategy" (a 500).
    if (!isGoogleOAuthConfigured()) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }
    return super.canActivate(context);
  }
}
