import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'identifier',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    identifier: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const recaptchaToken = (req.body as { recaptchaToken?: string })
      .recaptchaToken;

    return this.authService.validateUser(
      identifier,
      password,
      recaptchaToken ?? '',
    );
  }
}
