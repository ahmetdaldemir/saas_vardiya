import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const FEATURE_FLAGS_KEY = 'featureFlags';

export type TenantRequestContext = {
  tenantId: string;
  userId?: string;
  permissions: string[];
  roles: string[];
};

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireFeatures = (...features: string[]) =>
  SetMetadata(FEATURE_FLAGS_KEY, features);

export const TenantContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantRequestContext => {
    const request = context.switchToHttp().getRequest();
    return request.tenantContext;
  },
);
