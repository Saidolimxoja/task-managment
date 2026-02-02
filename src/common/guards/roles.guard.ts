// src/common/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.debug(`🔒 Required roles: ${requiredRoles}`);

    if (!requiredRoles || requiredRoles.length === 0) {
      this.logger.debug('✅ Roles not required');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('❌ User not found in request');
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    if (!user.role) {
      this.logger.warn('❌ User has no role');
      throw new ForbiddenException('У пользователя не назначена роль');
    }

    const hasRole = requiredRoles.includes(user.role);

    this.logger.debug(`👤 User role: ${user.role}, access: ${hasRole}`);

    if (!hasRole) {
      throw new ForbiddenException(
        `Доступ запрещён. Требуемые роли: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
