import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'client' | 'admin' | 'root'>) =>
  SetMetadata(ROLES_KEY, roles);
