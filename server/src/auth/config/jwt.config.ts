import 'dotenv/config';
import { registerAs } from '@nestjs/config';
import { StringValue } from 'ms';
type JwtConfig = {
  secret: string;
  signOptions: {
    expiresIn: StringValue;
  };
};

export default registerAs('jwt', (): JwtConfig => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  if (!expiresIn) {
    throw new Error('JWT_EXPIRES_IN is not defined in environment variables');
  }

  return { secret, signOptions: { expiresIn } } as JwtConfig;
});
