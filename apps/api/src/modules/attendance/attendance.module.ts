import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PermissionGuard } from '../core/permission.guard';
import { TenantGuard } from '../core/tenant.guard';
import { FeatureFlagEntity, UserEntity } from '../core/core.entities';
import { AttendanceController } from './attendance.controller';
import { AttendanceEventEntity } from './attendance.entities';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AttendanceEventEntity, UserEntity, FeatureFlagEntity])],
  controllers: [AttendanceController],
  providers: [AttendanceService, TenantGuard, PermissionGuard],
})
export class AttendanceModule {}
