import { UserModule } from './../users/users.module';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasskeyController } from './passkey.controller';
import { PasskeyService } from './passkey.service';
import { PasskeyCredential } from './entities/passkey-credential.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigType } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import refreshJwtConfig from './config/refresh-jwt.config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshJwtStrategy } from './strategies/refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { RoleGuard } from './guards/role/role.guard';
import { isGoogleOAuthConfigured } from './config/google-oauth.enabled';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(refreshJwtConfig),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [jwtConfig.KEY],
      useFactory: (cfg: ConfigType<typeof jwtConfig>) => ({
        secret: cfg.secret,
        signOptions: { expiresIn: cfg.signOptions.expiresIn },
      }),
    }),
    UserModule,
    TypeOrmModule.forFeature([PasskeyCredential]),
  ],
  controllers: [AuthController, PasskeyController],
  providers: [
    AuthService,
    PasskeyService,
    JwtStrategy,
    LocalStrategy,
    RefreshJwtStrategy,
    ...(isGoogleOAuthConfigured() ? [GoogleStrategy] : []),
    // Deny by default: every route needs a valid access token unless it is
    // marked @Public(). Adding a controller can no longer leave a hole open.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Runs after JwtAuthGuard, so req.user is populated by the time it checks.
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
