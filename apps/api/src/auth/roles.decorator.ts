
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

export const Roles = (...roles: UserRole[]) =>
  SetMetadata(ROLES_KEY, roles);
