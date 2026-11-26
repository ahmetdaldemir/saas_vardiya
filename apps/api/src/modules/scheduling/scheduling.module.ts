import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../core/core.entities';
import { PermissionGuard } from '../core/permission.guard';
import { TenantGuard } from '../core/tenant.guard';
import { SchedulingScoringService } from './scoring.service';
import { SchedulingController } from './scheduling.controller';
import {
  EmployeeAvailabilityEntity,
  EmployeeSeniorityEntity,
  ScheduleConflictEntity,
  SchedulePeriodEntity,
  ShiftAssignmentEntity,
  ShiftEntity,
} from './scheduling.entities';
import { SchedulingService } from './scheduling.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      SchedulePeriodEntity,
      ShiftEntity,
      ShiftAssignmentEntity,
      EmployeeAvailabilityEntity,
      EmployeeSeniorityEntity,
      ScheduleConflictEntity,
      UserEntity,
    ]),
  ],
  controllers: [SchedulingController],
  providers: [SchedulingService, SchedulingScoringService, TenantGuard, PermissionGuard],
  exports: [SchedulingService, SchedulingScoringService, TypeOrmModule],
})
export class SchedulingModule {}
