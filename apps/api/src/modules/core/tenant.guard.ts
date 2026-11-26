import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = user?.tenantId ?? request.headers['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required.');
    }

    request.tenantContext = {
      tenantId,
      userId: user?.sub,
      permissions: user?.permissions ?? [],
      roles: user?.roles ?? [],
    };

    return true;
  }
}
