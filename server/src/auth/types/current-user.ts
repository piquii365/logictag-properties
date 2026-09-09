import { UserRole } from '../enums/role.enum';

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
};
