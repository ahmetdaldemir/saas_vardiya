import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PermissionGuard } from '../core/permission.guard';
import { TenantGuard } from '../core/tenant.guard';
import { RequestsController } from './requests.controller';
import { EmployeeRequestEntity, EmployeeRequestEventEntity } from './requests.entities';
import { RequestsService } from './requests.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([EmployeeRequestEntity, EmployeeRequestEventEntity])],
  controllers: [RequestsController],
  providers: [RequestsService, TenantGuard, PermissionGuard],
})
export class RequestsModule {}
