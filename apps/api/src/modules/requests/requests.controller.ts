import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../core/permission.guard';
import { RequirePermissions, TenantContext, TenantRequestContext } from '../core/tenant-context';
import { TenantGuard } from '../core/tenant.guard';
import { RequestsService } from './requests.service';
import { EmployeeRequestStatus, EmployeeRequestType } from './requests.entities';

@ApiTags('employee-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('employee-requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  @RequirePermissions('requests.create')
  create(@TenantContext() context: TenantRequestContext, @Body() body: Record<string, unknown>) {
    return this.requests.create(context.tenantId, context.userId, body as never);
  }

  @Get()
  @RequirePermissions('requests.read')
  list(
    @TenantContext() context: TenantRequestContext,
    @Query('status') status?: EmployeeRequestStatus,
    @Query('type') type?: EmployeeRequestType,
  ) {
    return this.requests.list(context.tenantId, status, type);
  }

  @Get('mine')
  @RequirePermissions('requests.read_own')
  listMine(@TenantContext() context: TenantRequestContext) {
    return this.requests.listMine(context.tenantId, context.userId!);
  }

  @Post(':id/manager-approve')
  @RequirePermissions('requests.manager_approve')
  managerApprove(
    @TenantContext() context: TenantRequestContext,
    @Param('id') requestId: string,
    @Body() body: { comment?: string },
  ) {
    return this.requests.managerApprove(context.tenantId, requestId, context.userId, body.comment);
  }

  @Post(':id/manager-reject')
  @RequirePermissions('requests.manager_approve')
  managerReject(
    @TenantContext() context: TenantRequestContext,
    @Param('id') requestId: string,
    @Body() body: { comment?: string },
  ) {
    return this.requests.managerReject(context.tenantId, requestId, context.userId, body.comment);
  }

  @Post(':id/send-to-accounting')
  @RequirePermissions('requests.send_to_accounting')
  sendToAccounting(@TenantContext() context: TenantRequestContext, @Param('id') requestId: string) {
    return this.requests.sendToAccounting(context.tenantId, requestId, context.userId);
  }

  @Post(':id/accounting-approve')
  @RequirePermissions('requests.accounting_approve')
  accountingApprove(
    @TenantContext() context: TenantRequestContext,
    @Param('id') requestId: string,
    @Body() body: { comment?: string },
  ) {
    return this.requests.accountingApprove(context.tenantId, requestId, context.userId, body.comment);
  }

  @Post(':id/mark-paid')
  @RequirePermissions('requests.accounting_approve')
  markPaid(@TenantContext() context: TenantRequestContext, @Param('id') requestId: string) {
    return this.requests.markPaid(context.tenantId, requestId, context.userId);
  }

  @Get(':id/events')
  @RequirePermissions('requests.read')
  events(@TenantContext() context: TenantRequestContext, @Param('id') requestId: string) {
    return this.requests.eventsForRequest(context.tenantId, requestId);
  }
}
