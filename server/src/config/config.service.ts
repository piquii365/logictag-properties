import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly config: NestConfigService) {}

  //psql config
  get dbHost(): string {
    return this.config.get<string>('DB_HOST', 'localhost');
  }
  get dbPort(): number {
    return Number(this.config.get('DB_PORT') ?? 5432);
  }
  get dbUsername(): string {
    return this.config.get<string>('DB_USERNAME', 'postgres');
  }
  get dbPassword(): string {
    return this.config.getOrThrow<string>('DB_PASSWORD');
  }
  get dbName(): string {
    return this.config.get<string>('DB_NAME', 'bot_db');
  }
  // redis config
  get redisHost(): string {
    return this.config.get<string>('REDIS_HOST', 'localhost');
  }
  get redisPort(): number {
    return Number(this.config.get('REDIS_PORT') ?? 6379);
  }
  get redisTtl(): number {
    return Number(this.config.get('REDIS_CACHE_TTL') ?? 3600);
  }
  // token config
  get jwtSecret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }
  get jwtExpiresIn(): string {
    return this.config.get<string>('JWT_EXPIRES_IN', '1h');
  }
  get refreshJwtExpiresIn(): string {
    return this.config.get<string>('REFRESH_JWT_EXPIRES_IN', '7d');
  }
  get refreshJwtSecret(): string {
    return this.config.getOrThrow<string>('REFRESH_JWT_SECRET');
  }

  // google oauth config
  get googleClientId(): string {
    return this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
  }
  get googleClientSecret(): string {
    return this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
  }
  get googleCallbackUrl(): string {
    return (
      this.config.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3000/auth/google/callback'
    );
  }

  // PesePay config — both optional; the feature is disabled (404) without them.
  get pesepayIntegrationKey(): string | undefined {
    return this.config.get<string>('PESEPAY_INTEGRATION_KEY');
  }
  get pesepayEncryptionKey(): string | undefined {
    return this.config.get<string>('PESEPAY_ENCRYPTION_KEY');
  }
  get pesepayResultUrl(): string {
    return (
      this.config.get<string>('PESEPAY_RESULT_URL') ||
      'http://localhost:3000/payments/pesepay/result'
    );
  }
  get isPesepayConfigured(): boolean {
    return !!this.pesepayIntegrationKey && !!this.pesepayEncryptionKey;
  }

  get smtpHost(): string | undefined {
    return this.config.get<string>('SMTP_HOST');
  }
  get smtpPort(): number {
    return Number(this.config.get('SMTP_PORT') ?? 587);
  }
  get smtpSecure(): boolean {
    return this.config.get<string>('SMTP_SECURE') === 'true';
  }
  get smtpUser(): string | undefined {
    return this.config.get<string>('SMTP_USER');
  }
  get smtpPassword(): string | undefined {
    return this.config.get<string>('SMTP_PASSWORD');
  }
  get smtpFrom(): string | undefined {
    return this.config.get<string>('SMTP_FROM');
  }
  get isSmtpConfigured(): boolean {
    return !!this.smtpHost && !!this.smtpFrom;
  }
}
