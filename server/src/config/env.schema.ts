import { z } from 'zod';

/**
 * Every env var ConfigService reads via getOrThrow(). Validated once at
 * bootstrap so a missing var fails fast with one clear, aggregated error
 * instead of crashing lazily the first time some unrelated feature touches it.
 */
const envSchema = z.object({
  DB_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  REFRESH_JWT_SECRET: z.string().min(1),
  // Google OAuth is optional: without these the /auth/google routes 401,
  // but the rest of the server still boots.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  // PesePay is optional too: without these the /payments/*/pesepay/* routes 404.
  PESEPAY_INTEGRATION_KEY: z.string().optional(),
  PESEPAY_ENCRYPTION_KEY: z.string().optional(),
  PESEPAY_RESULT_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  // WebAuthn / passkeys are optional: without these the passkey routes 404.
  WEBAUTHN_RP_ID: z.string().optional(),
  WEBAUTHN_RP_NAME: z.string().optional(),
  WEBAUTHN_ORIGIN: z.string().optional(),
  CLIENT_ORIGIN: z.string().optional(),
});

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => issue.path.join('.'))
      .join(', ');
    throw new Error(
      `Missing/invalid required environment variables: ${missing}`,
    );
  }
  return config;
}
