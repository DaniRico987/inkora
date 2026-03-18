import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../roles.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      Array<'client' | 'admin' | 'root'>
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    if (user.userType === 'admin') {
      const isRootOnly = requiredRoles.length === 1 && requiredRoles[0] === 'root';
      if (isRootOnly) {
        throw new ForbiddenException('Solo root puede ejecutar esta acción');
      }
      return true;
    }

    const hasRole = requiredRoles.includes(user.userType);
    if (!hasRole) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }

    return true;
  }
}
