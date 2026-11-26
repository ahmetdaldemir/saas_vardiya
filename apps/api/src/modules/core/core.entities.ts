import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserType {
  Admin = 'admin',
  Manager = 'manager',
  Employee = 'employee',
}

export enum UserStatus {
  Active = 'active',
  Invited = 'invited',
  Suspended = 'suspended',
}

@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ default: 'general' })
  industry: string;

  @Column({ default: 'starter' })
  plan: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('organizations')
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  legalName?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('departments')
export class DepartmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  parentDepartmentId?: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code?: string;

  @Column({ default: 'active' })
  status: string;
}

@Entity('locations')
export class LocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  organizationId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  code?: string;

  @Column({ default: 'site' })
  type: string;

  @Column({ default: 'active' })
  status: string;
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId?: string;

  @Column({ type: 'uuid', nullable: true })
  locationId?: string;

  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserType, default: UserType.Employee })
  userType: UserType;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.Active })
  status: UserStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('employee_profiles')
export class EmployeeProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  userId: string;

  @Column({ nullable: true })
  employeeNumber?: string;

  @Column({ nullable: true })
  identityNumber?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  jobTitle?: string;

  @Column({ nullable: true })
  employmentType?: string;

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  birthDate?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  emergencyContactName?: string;

  @Column({ nullable: true })
  emergencyContactPhone?: string;

  @Column({ nullable: true })
  bankIban?: string;

  @Column({ type: 'numeric', nullable: true })
  salaryAmount?: number;

  @Column({ default: 'TRY' })
  salaryCurrency: string;

  @Column({ default: 'monthly' })
  salaryPeriod: string;

  @Column({ type: 'jsonb', default: {} })
  documents: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  @Column()
  key: string;

  @Column()
  name: string;

  @Column({ default: false })
  isSystemRole: boolean;
}

@Entity('permissions')
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  module: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  description?: string;
}

@Entity('user_roles')
export class UserRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  roleId: string;
}

@Entity('role_permissions')
export class RolePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  roleId: string;

  @Column('uuid')
  permissionId: string;
}

@Entity('feature_flags')
export class FeatureFlagEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  key: string;

  @Column()
  name: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;
}

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  actorUserId?: string;

  @Column()
  action: string;

  @Column()
  resourceType: string;

  @Column({ type: 'uuid', nullable: true })
  resourceId?: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  newValues?: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
