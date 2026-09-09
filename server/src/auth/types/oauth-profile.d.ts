import { AuthProvider } from '../enums/auth-provider.enum';
export interface OAuthProfile {
  provider: AuthProvider;
  providerId: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}
