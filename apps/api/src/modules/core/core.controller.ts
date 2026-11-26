import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequirePermissions, TenantContext, TenantRequestContext } from './tenant-context';
import { TenantGuard } from './tenant.guard';
import { CoreService } from './core.service';

@ApiTags('core')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller()
export class CoreController {
  constructor(private readonly core: CoreService) {}

  @Get('tenants')
  @RequirePermissions('tenants.read')
  listTenants() {
    return this.core.listTenants();
  }

  @Post('tenants')
  @RequirePermissions('tenants.manage')
  createTenant(@Body() body: Record<string, unknown>) {
    return this.core.createTenant(body);
  }

  @Get('tenants/:tenantId/users')
  @RequirePermissions('tenants.read')
  listTenantUsers(@Param('tenantId') tenantId: string) {
    return this.core.listTenantUsers(tenantId);
  }

  @Post('tenants/:tenantId/users')
  @RequirePermissions('tenants.manage')
  createTenantUser(@Param('tenantId') tenantId: string, @Body() body: Record<string, unknown>) {
    return this.core.createTenantUser(tenantId, body as never);
  }

  @Get('users')
  @RequirePermissions('users.read')
  listUsers(@TenantContext() context: TenantRequestContext) {
    return this.core.listUsers(context.tenantId);
  }

  @Get('employees/personnel-files')
  @RequirePermissions('users.read')
  listPersonnelFiles(@TenantContext() context: TenantRequestContext) {
    return this.core.listPersonnelFiles(context.tenantId);
  }

  @Post('employees/personnel-files')
  @RequirePermissions('users.create')
  createPersonnelFile(@TenantContext() context: TenantRequestContext, @Body() body: Record<string, unknown>) {
    return this.core.createPersonnelFile(context.tenantId, body as never);
  }

  @Post('users')
  @RequirePermissions('users.create')
  createUser(@TenantContext() context: TenantRequestContext, @Body() body: Record<string, unknown>) {
    return this.core.createUser(context.tenantId, body);
  }

  @Get('organizations')
  @RequirePermissions('organizations.read')
  listOrganizations(@TenantContext() context: TenantRequestContext) {
    return this.core.listOrganizations(context.tenantId);
  }

  @Post('organizations')
  @RequirePermissions('organizations.manage')
  createOrganization(@TenantContext() context: TenantRequestContext, @Body() body: Record<string, unknown>) {
    return this.core.createOrganization(context.tenantId, body);
  }

  @Get('departments')
  @RequirePermissions('departments.read')
  listDepartments(@TenantContext() context: TenantRequestContext) {
    return this.core.listDepartments(context.tenantId);
  }

  @Post('departments')
  @RequirePermissions('departments.manage')
  createDepartment(@TenantContext() context: TenantRequestContext, @Body() body: Record<string, unknown>) {
    return this.core.createDepartment(context.tenantId, body);
  }

  @Get('locations')
  @RequirePermissions('locations.read')
  listLocations(@TenantContext() context: TenantRequestContext) {
    return this.core.listLocations(context.tenantId);
  }

  @Post('locations')
  @RequirePermissions('locations.manage')
  createLocation(@TenantContext() context: TenantRequestContext, @Body() body: Record<string, unknown>) {
    return this.core.createLocation(context.tenantId, body);
  }

  @Get('feature-flags')
  @RequirePermissions('features.read')
  listFeatureFlags(@TenantContext() context: TenantRequestContext) {
    return this.core.listFeatureFlags(context.tenantId);
  }

  @Patch('feature-flags/:key')
  @RequirePermissions('features.manage')
  setFeatureFlag(
    @TenantContext() context: TenantRequestContext,
    @Param('key') key: string,
    @Body() body: { enabled: boolean; config?: Record<string, unknown> },
  ) {
    return this.core.setFeatureFlag(context.tenantId, key, body.enabled, body.config);
  }

  @Get('audit-logs')
  @RequirePermissions('audit.read')
  listAuditLogs(@TenantContext() context: TenantRequestContext) {
    return this.core.listAuditLogs(context.tenantId);
  }
}
