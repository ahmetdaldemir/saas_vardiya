import { Body, Controller, ForbiddenException, Get, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../core/permission.guard';
import { RequirePermissions, TenantContext, TenantRequestContext } from '../core/tenant-context';
import { TenantGuard } from '../core/tenant.guard';
import { AttendanceEventType } from './attendance.entities';
import { AttendanceService } from './attendance.service';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  @RequirePermissions('requests.read')
  list(@TenantContext() context: TenantRequestContext) {
    return this.attendance.list(context.tenantId);
  }

  @Get('mine')
  @RequirePermissions('requests.read_own')
  listMine(@TenantContext() context: TenantRequestContext) {
    return this.attendance.listMine(context.tenantId, context.userId!);
  }

  @Get('alerts')
  @RequirePermissions('requests.read')
  alerts(@TenantContext() context: TenantRequestContext) {
    return this.attendance.alerts(context.tenantId);
  }

  @Post('shift-start')
  @RequirePermissions('requests.create')
  shiftStart(@TenantContext() context: TenantRequestContext, @Headers('x-client-type') clientType = 'web', @Headers('x-forwarded-for') forwardedFor?: string, @Ip() ip?: string) {
    this.assertMobileClient(clientType);
    return this.attendance.createEvent(context.tenantId, context.userId!, AttendanceEventType.ShiftStart, 45, forwardedFor ?? ip);
  }

  @Post('shift-end')
  @RequirePermissions('requests.create')
  shiftEnd(@TenantContext() context: TenantRequestContext, @Headers('x-client-type') clientType = 'web', @Headers('x-forwarded-for') forwardedFor?: string, @Ip() ip?: string) {
    this.assertMobileClient(clientType);
    return this.attendance.createEvent(context.tenantId, context.userId!, AttendanceEventType.ShiftEnd, 45, forwardedFor ?? ip);
  }

  @Post('break-start')
  @RequirePermissions('requests.create')
  breakStart(@TenantContext() context: TenantRequestContext, @Headers('x-client-type') clientType = 'web', @Headers('x-forwarded-for') forwardedFor?: string, @Ip() ip?: string) {
    this.assertMobileClient(clientType);
    return this.attendance.createEvent(context.tenantId, context.userId!, AttendanceEventType.BreakStart, 45, forwardedFor ?? ip);
  }

  @Post('break-end')
  @RequirePermissions('requests.create')
  breakEnd(
    @TenantContext() context: TenantRequestContext,
    @Body() body: { breakLimitMinutes?: number },
    @Headers('x-client-type') clientType = 'web',
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Ip() ip?: string,
  ) {
    this.assertMobileClient(clientType);
    return this.attendance.createEvent(
      context.tenantId,
      context.userId!,
      AttendanceEventType.BreakEnd,
      body.breakLimitMinutes ?? 45,
      forwardedFor ?? ip,
    );
  }

  private assertMobileClient(clientType: string) {
    if (clientType !== 'mobile') {
      throw new ForbiddenException('Mesai bildirimi sadece mobil uygulamadan yapılabilir.');
    }
  }
}
