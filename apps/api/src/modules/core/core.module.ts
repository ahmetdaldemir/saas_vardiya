import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  AuditLogEntity,
  DepartmentEntity,
  EmployeeProfileEntity,
  FeatureFlagEntity,
  LocationEntity,
  OrganizationEntity,
  PermissionEntity,
  RoleEntity,
  RolePermissionEntity,
  TenantEntity,
  UserEntity,
  UserRoleEntity,
} from './core.entities';
import { CoreController } from './core.controller';
import { CoreService } from './core.service';
import { PermissionGuard } from './permission.guard';
import { TenantGuard } from './tenant.guard';

const coreEntities = [
  TenantEntity,
  OrganizationEntity,
  DepartmentEntity,
  LocationEntity,
  UserEntity,
  EmployeeProfileEntity,
  RoleEntity,
  PermissionEntity,
  UserRoleEntity,
  RolePermissionEntity,
  FeatureFlagEntity,
  AuditLogEntity,
];

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature(coreEntities)],
  controllers: [CoreController],
  providers: [CoreService, TenantGuard, PermissionGuard],
  exports: [CoreService, TypeOrmModule],
})
export class CoreModule {}
