import { UserRole } from '../enums/role.enum';

export type AuthJwtPayload = {
  id: string;
  email: string;
  role: UserRole;
};
