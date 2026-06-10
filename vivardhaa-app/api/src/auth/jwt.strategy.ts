import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  name: string;
  phone: string;
  isAdmin: boolean;
  menuItems: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'vivardhaa_jwt_secret_change_in_prod'),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      name: payload.name,
      phone: payload.phone,
      isAdmin: payload.isAdmin,
      menuItems: payload.menuItems,
    };
  }
}
