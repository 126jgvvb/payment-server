import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JWTService } from '../services/jwt/jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JWTService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authorizationHeader = request.headers['authorization'];

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is missing or invalid');
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    const decodedToken = this.jwtService.verifyToken(token);

    if (!decodedToken) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach the decoded token data to the request object
    request.user = decodedToken;
    return true;
  }
}
