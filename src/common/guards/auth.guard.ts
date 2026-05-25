import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import { PUBLIC_KEY } from '@decorators/publicDecorator';
import { UserRepository } from '@models/index';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {

    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_KEY,
      [
        context.getHandler(),
        context.getClass(),
      ],
    );

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException(
        'Authorization header is missing',
      );
    }

    // Bearer TOKEN
    const [bearer, token] = authorization.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Invalid token format',
      );
    }

    try {

      const payload = this.jwtService.verify<{
        _id: string;
        email: string;
        role: string;
      }>(token, {
        secret: this.configService.get<string>(
          'JWT_SECRET',
        ),
      });

      const userExist = await this.userRepository.findOne({
        filter: {
          _id: payload._id,
        },
      });

      if (!userExist) {
        throw new NotFoundException('User not found');
      }

      // Attach user to request
      request.user = userExist;

      return true;

    }
    catch (error: unknown) {
        if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
           throw new UnauthorizedException('Invalid or expired token');
        }

        throw error;
   }
}
}