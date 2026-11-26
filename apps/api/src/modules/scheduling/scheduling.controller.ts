import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../core/permission.guard';
import { RequirePermissions, TenantContext, TenantRequestContext } from '../core/tenant-context';
import { TenantGuard } from '../core/tenant.guard';
import { SchedulingService } from './scheduling.service';

@ApiTags('scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller()
export class SchedulingController {
  constructor(private readonly scheduling: SchedulingService) {}

  @Post('schedule-periods')
  @RequirePermissions('schedules.manage')
  createPeriod(@TenantContext() context: TenantRequestContext, @Body() body: Record<string, unknown>) {
    return this.scheduling.createPeriod(context.tenantId, body);
  }

  @Get('schedule-periods')
  @RequirePermissions('schedules.read')
  listPeriods(@TenantContext() context: TenantRequestContext) {
    return this.scheduling.listPeriods(context.tenantId);
  }

  @Post('shifts')
  @RequirePermissions('schedules.manage')
  createShift(@TenantContext() context: TenantRequestContext, @Body() body: Record<string, unknown>) {
    return this.scheduling.createShift(context.tenantId, body);
  }

  @Get('shifts')
  @RequirePermissions('schedules.read')
  listShifts(@TenantContext() context: TenantRequestContext, @Query('schedulePeriodId') schedulePeriodId?: string) {
    return this.scheduling.listShifts(context.tenantId, schedulePeriodId);
  }

  @Post('shifts/:id/assign')
  @RequirePermissions('schedules.manage')
  assignShift(
    @TenantContext() context: TenantRequestContext,
    @Param('id') shiftId: string,
    @Body() body: { employeeId: string },
  ) {
    return this.scheduling.assignShift(context.tenantId, shiftId, body.employeeId);
  }

  @Post('employees/:id/availability')
  @RequirePermissions('schedules.manage')
  createAvailability(
    @TenantContext() context: TenantRequestContext,
    @Param('id') employeeId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.scheduling.createAvailability(context.tenantId, { ...body, employeeId });
  }

  @Post('schedules/:periodId/generate')
  @RequirePermissions('schedules.manage')
  generate(@TenantContext() context: TenantRequestContext, @Param('periodId') schedulePeriodId: string) {
    return this.scheduling.generateSchedule(context.tenantId, schedulePeriodId);
  }

  @Get('schedules/:periodId/conflicts')
  @RequirePermissions('schedules.read')
  listConflicts(@TenantContext() context: TenantRequestContext, @Param('periodId') schedulePeriodId: string) {
    return this.scheduling.listConflicts(context.tenantId, schedulePeriodId);
  }
}
