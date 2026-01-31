// src/common/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  private logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.log('🔒 Required roles:', requiredRoles);

    if (!requiredRoles) {
      this.logger.log('✅ Не требуеться РОль для пользования этим Сервиом');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    this.logger.log('👤 User from request:', user);
    this.logger.log('👤 User role:', user?.role);
    this.logger.log('👤 Required roles:', requiredRoles);

    if (!user || !user.role) {
      this.logger.warn('❌ No user or role found');
      return false;
    }

    const hasRole = requiredRoles.includes(user.role);
    this.logger.log(`✅ Role check result: ${hasRole}`);

    if (!hasRole) {
      this.logger.warn(
        `❌ User role "${user.role}" not in required roles:`,
        requiredRoles,
      );
    }

    return hasRole;
  }
}
