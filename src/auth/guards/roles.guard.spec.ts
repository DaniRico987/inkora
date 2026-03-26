import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const createContext = (user?: AuthenticatedUser): ExecutionContext => {
    return {
      getClass: jest.fn(),
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const canActivate = guard.canActivate(createContext());

    expect(canActivate).toBe(true);
  });

  it('should allow admin when admin role is required', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    const canActivate = guard.canActivate(
      createContext({
        userId: 1,
        email: 'admin@inkora.com',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        userType: 'admin',
        status: 'active',
      }),
    );

    expect(canActivate).toBe(true);
  });

  it('should deny client when admin role is required', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() =>
      guard.canActivate(
        createContext({
          userId: 2,
          email: 'client@inkora.com',
          username: 'client',
          firstName: 'Client',
          lastName: 'User',
          userType: 'client',
          status: 'active',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should deny admin when endpoint is root-only', () => {
    reflector.getAllAndOverride.mockReturnValue(['root']);

    expect(() =>
      guard.canActivate(
        createContext({
          userId: 3,
          email: 'admin@inkora.com',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          userType: 'admin',
          status: 'active',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should deny root when admin role is required', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() =>
      guard.canActivate(
        createContext({
          userId: 10,
          email: 'root@inkora.com',
          username: 'root',
          firstName: 'Root',
          lastName: 'User',
          userType: 'root',
          status: 'active',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('should throw unauthorized when user is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });
});
