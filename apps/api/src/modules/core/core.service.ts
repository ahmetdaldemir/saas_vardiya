import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import {
  AuditLogEntity,
  DepartmentEntity,
  EmployeeProfileEntity,
  FeatureFlagEntity,
  LocationEntity,
  OrganizationEntity,
  TenantEntity,
  UserEntity,
  UserStatus,
  UserType,
} from './core.entities';

@Injectable()
export class CoreService {
  constructor(
    @InjectRepository(TenantEntity) private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(EmployeeProfileEntity) private readonly employeeProfiles: Repository<EmployeeProfileEntity>,
    @InjectRepository(OrganizationEntity) private readonly organizations: Repository<OrganizationEntity>,
    @InjectRepository(DepartmentEntity) private readonly departments: Repository<DepartmentEntity>,
    @InjectRepository(LocationEntity) private readonly locations: Repository<LocationEntity>,
    @InjectRepository(FeatureFlagEntity) private readonly features: Repository<FeatureFlagEntity>,
    @InjectRepository(AuditLogEntity) private readonly audits: Repository<AuditLogEntity>,
  ) {}

  listTenants() {
    return this.tenants.find({ order: { createdAt: 'DESC' } });
  }

  async createTenant(payload: Partial<TenantEntity>) {
    const tenant = await this.tenants.save(
      this.tenants.create({
        ...payload,
        status: payload.status ?? 'active',
        plan: payload.plan ?? 'starter',
        timezone: payload.timezone ?? 'Europe/Istanbul',
      }),
    );

    await this.features.save([
      this.features.create({ tenantId: tenant.id, key: 'core_scheduling', name: 'Vardiya Planlama', enabled: true }),
      this.features.create({ tenantId: tenant.id, key: 'personnel_requests', name: 'Personel Talepleri', enabled: true }),
      this.features.create({ tenantId: tenant.id, key: `${tenant.industry}_module`, name: `${tenant.industry} Modülü`, enabled: true }),
    ]);

    return tenant;
  }

  listUsers(tenantId: string) {
    return this.users.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  createUser(tenantId: string, payload: Partial<UserEntity>) {
    return this.users.save(this.users.create({ ...payload, tenantId }));
  }

  listPersonnelFiles(tenantId: string) {
    return this.employeeProfiles.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async createPersonnelFile(
    tenantId: string,
    payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      employeeNumber?: string;
      identityNumber?: string;
      phone?: string;
      jobTitle?: string;
      employmentType?: string;
      startDate?: string;
      birthDate?: string;
      address?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      bankIban?: string;
      salaryAmount?: number;
      salaryCurrency?: string;
      salaryPeriod?: string;
      documents?: Record<string, unknown>;
    },
  ) {
    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await this.users.save(
      this.users.create({
        tenantId,
        email: payload.email.toLowerCase(),
        passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        userType: UserType.Employee,
        status: UserStatus.Active,
      }),
    );

    return this.employeeProfiles.save(
      this.employeeProfiles.create({
        tenantId,
        userId: user.id,
        employeeNumber: payload.employeeNumber,
        identityNumber: payload.identityNumber,
        phone: payload.phone,
        jobTitle: payload.jobTitle,
        employmentType: payload.employmentType,
        startDate: payload.startDate,
        birthDate: payload.birthDate,
        address: payload.address,
        emergencyContactName: payload.emergencyContactName,
        emergencyContactPhone: payload.emergencyContactPhone,
        bankIban: payload.bankIban,
        salaryAmount: payload.salaryAmount,
        salaryCurrency: payload.salaryCurrency ?? 'TRY',
        salaryPeriod: payload.salaryPeriod ?? 'monthly',
        documents: payload.documents ?? {},
      }),
    );
  }

  listTenantUsers(tenantId: string) {
    return this.users.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        userType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createTenantUser(
    tenantId: string,
    payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      userType?: UserType;
    },
  ) {
    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await this.users.save(
      this.users.create({
        tenantId,
        email: payload.email.toLowerCase(),
        passwordHash,
        firstName: payload.firstName,
        lastName: payload.lastName,
        userType: payload.userType ?? UserType.Admin,
        status: UserStatus.Active,
      }),
    );

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  listOrganizations(tenantId: string) {
    return this.organizations.find({ where: { tenantId } });
  }

  createOrganization(tenantId: string, payload: Partial<OrganizationEntity>) {
    return this.organizations.save(this.organizations.create({ ...payload, tenantId }));
  }

  listDepartments(tenantId: string) {
    return this.departments.find({ where: { tenantId } });
  }

  createDepartment(tenantId: string, payload: Partial<DepartmentEntity>) {
    return this.departments.save(this.departments.create({ ...payload, tenantId }));
  }

  listLocations(tenantId: string) {
    return this.locations.find({ where: { tenantId } });
  }

  createLocation(tenantId: string, payload: Partial<LocationEntity>) {
    return this.locations.save(this.locations.create({ ...payload, tenantId }));
  }

  listFeatureFlags(tenantId: string) {
    return this.features.find({ where: { tenantId } });
  }

  async setFeatureFlag(tenantId: string, key: string, enabled: boolean, config = {}) {
    const existing = await this.features.findOne({ where: { tenantId, key } });
    const feature = existing ?? this.features.create({ tenantId, key, name: key });
    feature.enabled = enabled;
    feature.config = config;
    return this.features.save(feature);
  }

  writeAuditLog(tenantId: string, payload: Partial<AuditLogEntity>) {
    return this.audits.save(this.audits.create({ ...payload, tenantId }));
  }

  listAuditLogs(tenantId: string) {
    return this.audits.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 100 });
  }
}
