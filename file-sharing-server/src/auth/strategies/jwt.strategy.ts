import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import {
  COOKIE,
  AUTH_MESSAGES,
  APP_STATUS_CODES
} from '../../constants/app.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const token = req?.cookies?.[COOKIE.ACCESS_TOKEN] as
            | string
            | undefined;
          return token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', ''),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload?.userId) {
      throw new UnauthorizedException({
        statusCode: APP_STATUS_CODES.UNAUTHORIZED,
        message: AUTH_MESSAGES.UNAUTHORIZED
      });
    }
    return payload;
  }
}
