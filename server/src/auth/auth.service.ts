import {
  Injectable,
  BadRequestException,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuthJwtPayload } from './types/jwt-payload.auth';
import type { ConfigType } from '@nestjs/config';
import refreshJwtConfig from './config/refresh-jwt.config';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import { compare } from 'bcryptjs';
import { UserRole } from './enums/role.enum';
import { UserStatus } from '../users/enums/status.enum';
import { RegisterDto } from './dto/register.dto';

export type AuthSessionResponse = {
  body: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    accessToken: string;
  };
  refreshToken: string;
};

/** Same message for every credential failure: no account enumeration. */
const INVALID_CREDENTIALS = 'Invalid credentials';

/** Same message whether or not the email exists: no account enumeration. */
const RESET_REQUESTED =
  'If an account with that email exists, a password reset link has been sent';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Same TTL for email-change confirmation codes. */
const EMAIL_CHANGE_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    @Inject(refreshJwtConfig.KEY)
    private refreshJwtConfigService: ConfigType<typeof refreshJwtConfig>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionResponse> {
    const user = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
      role: dto.role,
    });
    if (!user) {
      throw new BadRequestException('Registration failed');
    }
    return this.login(user.id, user.name, user.email, user.role);
  }

  async validateUser(user: string, password: string): Promise<AuthJwtPayload> {
    const foundUser = await this.userService.findByEmailWithSecrets(user);
    // Password-less accounts are OAuth-only; they must not pass local login.
    if (!foundUser?.password) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    const passwordMatch = await compare(password, foundUser.password);
    if (!passwordMatch) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    this.assertActive(foundUser.status);
    return {
      id: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
    };
  }

  async login(
    id: string,
    username: string,
    email: string,
    role: UserRole,
  ): Promise<AuthSessionResponse> {
    const payload: AuthJwtPayload = { id, email, role };
    const { accessToken, refreshToken } = await this.generateTokens(payload);
    await this.userService.updateHashedRefreshToken(
      id,
      this.hashRefreshToken(refreshToken),
    );
    await this.userService.touchLastLogin(id);
    return {
      body: { id, username, email, role, accessToken },
      refreshToken,
    };
  }

  private async generateTokens(
    user: AuthJwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(user),
      // jti makes every refresh token unique. Without it two tokens minted in
      // the same second are byte-identical, and rotation invalidates nothing.
      this.jwtService.signAsync(
        { ...user, jti: randomUUID() },
        this.refreshJwtConfigService,
      ),
    ]);
    return { accessToken, refreshToken };
  }

  /** Rotates the refresh token: the previous one stops working immediately. */
  async refreshToken(
    id: string,
    username: string,
    email: string,
    role: UserRole,
  ): Promise<AuthSessionResponse> {
    return this.login(id, username, email, role);
  }

  async validateRefreshToken(
    id: string,
    refreshToken: string,
  ): Promise<AuthJwtPayload> {
    const user = await this.userService.getUserRefreshToken(id);
    if (!user?.hashedRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (!this.isRefreshTokenHashValid(refreshToken, user.hashedRefreshToken)) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    this.assertActive(user.status);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHmac('sha256', this.refreshJwtConfigService.secret)
      .update(refreshToken)
      .digest('hex');
  }

  private isRefreshTokenHashValid(
    refreshToken: string,
    hashedRefreshToken: string,
  ): boolean {
    return this.hashesMatch(
      this.hashRefreshToken(refreshToken),
      hashedRefreshToken,
    );
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userService.findOneByIdWithSecrets(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (!user.password) {
      throw new BadRequestException(
        'Cannot change password for OAuth accounts',
      );
    }
    const passwordMatch = await compare(currentPassword, user.password);
    if (!passwordMatch) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.userService.changePassword(id, newPassword);
    return { message: 'Password changed successfully' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.userService.getUserForPasswordReset(email);
    // Always answer the same way, whether or not the account exists.
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.userService.setPasswordResetToken(
        user.id,
        this.hashResetToken(token),
        new Date(Date.now() + RESET_TOKEN_TTL_MS),
      );
      await this.sendPasswordResetEmail(user.email, token);
    }
    return { message: RESET_REQUESTED };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.userService.getUserForPasswordReset(email);
    const isValid =
      !!user &&
      this.isResetTokenValid(
        token,
        user.passwordResetToken,
        user.passwordResetTokenExpiration,
      );
    if (!user || !isValid) {
      throw new BadRequestException('Invalid or expired password reset token');
    }
    // changePassword clears the reset token and every refresh token, so the
    // link is single-use and any stolen session dies with it.
    await this.userService.changePassword(user.id, newPassword);
    return { message: 'Password reset successfully' };
  }

  async requestEmailChange(id: string, newEmail: string) {
    const user = await this.userService.findOneById(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const email = newEmail.trim().toLowerCase();
    if (email === user.email.toLowerCase()) {
      throw new BadRequestException(
        'New email is the same as your current email',
      );
    }
    const token = randomBytes(32).toString('hex');
    await this.userService.stageEmailChange(
      user.id,
      email,
      this.hashResetToken(token),
      new Date(Date.now() + EMAIL_CHANGE_TOKEN_TTL_MS),
    );
    await this.sendEmailChangeEmail(email, token);
    return {
      message:
        'A confirmation code has been sent to the new email. Your email will only change once you confirm it.',
    };
  }

  async confirmEmailChange(token: string) {
    const tokenHash = this.hashResetToken(token);
    const user = await this.userService.getUserForEmailChange(tokenHash);
    const isValid =
      !!user &&
      this.isResetTokenValid(
        token,
        user.emailChangeToken,
        user.emailChangeTokenExpiration,
      );
    if (!user || !isValid) {
      throw new BadRequestException(
        'Invalid or expired email confirmation code',
      );
    }
    const updated = await this.userService.applyEmailChange(user.id);
    if (!updated) {
      throw new BadRequestException('User not found');
    }
    return {
      message: 'Email updated successfully',
      email: updated.email,
    };
  }

  async getProfile(id: string) {
    const user = await this.userService.findOne(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  async signOut(id: string) {
    await this.userService.updateHashedRefreshToken(id, null);
    return { message: 'Signed out successfully' };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sendPasswordResetEmail(email: string, token: string) {
    // ponytail: no mailer wired up yet. Log the link in non-production so the
    // flow is testable end to end; swap for a real transport when one exists.
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`Password reset token for ${email}: ${token}`);
    }
    return Promise.resolve();
  }

  private sendEmailChangeEmail(email: string, token: string) {
    // ponytail: no mailer wired up yet. Log the code in non-production so the
    // flow is testable end to end; swap for a real transport when one exists.
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `Email change confirmation code for ${email}: ${token}`,
      );
    }
    return Promise.resolve();
  }

  private isResetTokenValid(
    token: string,
    tokenHash: string | null,
    expiresAt: Date | null,
  ): boolean {
    if (!tokenHash || !expiresAt) {
      return false;
    }
    if (new Date(expiresAt).getTime() < Date.now()) {
      return false;
    }
    return this.hashesMatch(this.hashResetToken(token), tokenHash);
  }

  /**
   * Constant-time compare of two hex digests. timingSafeEqual throws on a
   * length mismatch, which a malformed client token would otherwise turn
   * into a 500, so the lengths are checked first.
   */
  private hashesMatch(computed: string, stored: string): boolean {
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(stored, 'hex');
    if (a.length === 0 || a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  private assertActive(status: UserStatus) {
    if (status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is suspended');
    }
  }

  async validateJwtUser(userId: string): Promise<AuthJwtPayload> {
    const user = await this.userService.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    this.assertActive(user.status);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async handleOAuthLogin(userId: string): Promise<AuthSessionResponse> {
    const user = await this.userService.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    this.assertActive(user.status);
    return this.login(user.id, user.name, user.email, user.role);
  }
}
