import 'dotenv/config';
import { registerAs } from '@nestjs/config';
import { StringValue } from 'ms';

type RefreshJwtConfig = {
  secret: string;
  expiresIn: StringValue;
};

export default registerAs('refresh-jwt', (): RefreshJwtConfig => {
  const secret = process.env.REFRESH_JWT_SECRET;
  const expiresIn = process.env.REFRESH_JWT_EXPIRES_IN || '7d';

  if (!secret) {
    throw new Error(
      'REFRESH_JWT_SECRET is not defined in environment variables',
    );
  }

  if (!expiresIn) {
    throw new Error(
      'REFRESH_JWT_EXPIRES_IN is not defined in environment variables',
    );
  }

  return { secret, expiresIn } as RefreshJwtConfig;
});
