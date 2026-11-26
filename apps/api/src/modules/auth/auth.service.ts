import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { TenantEntity, UserEntity, UserType } from '../core/core.entities';

type LoginInput = {
  tenantSlug: string;
  email: string;
  password: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(TenantEntity) private readonly tenants: Repository<TenantEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginInput, clientType = 'web') {
    const tenant = await this.tenants.findOne({ where: { slug: input.tenantSlug } });
    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant or credentials.');
    }

    const user = await this.users.findOne({
      where: { tenantId: tenant.id, email: input.email.toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid tenant or credentials.');
    }

    if (user.userType === UserType.Employee && clientType !== 'mobile') {
      throw new UnauthorizedException('Personel hesapları sadece mobil uygulamadan giriş yapabilir.');
    }

    const isPlatformAdmin = tenant.slug === 'demo' && user.userType === 'admin' && user.email === 'admin@smartshift.local';
    const permissions = this.defaultPermissionsForUserType(user.userType, isPlatformAdmin);
    const roles = [isPlatformAdmin ? 'platform_admin' : user.userType];
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantIndustry: tenant.industry,
      organizationId: user.organizationId,
      roles,
      permissions,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        tenantIndustry: tenant.industry,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions,
      },
    };
  }

  getMe(tokenPayload: Record<string, unknown>) {
    return tokenPayload;
  }

  private defaultPermissionsForUserType(userType: string, isPlatformAdmin = false): string[] {
    if (isPlatformAdmin) {
      return [
        'tenants.read',
        'tenants.manage',
        'features.read',
        'features.manage',
        'audit.read',
      ];
    }

    if (userType === 'admin') {
      return [
        'users.read',
        'users.create',
        'organizations.read',
        'organizations.manage',
        'departments.read',
        'departments.manage',
        'locations.read',
        'locations.manage',
        'features.read',
        'features.manage',
        'audit.read',
        'schedules.read',
        'schedules.manage',
        'bids.read',
        'bids.manage',
        'requests.read',
        'requests.create',
        'requests.read_own',
        'requests.manager_approve',
        'requests.send_to_accounting',
        'requests.accounting_approve',
      ];
    }

    if (userType === 'manager') {
      return [
        'users.read',
        'departments.read',
        'locations.read',
        'schedules.read',
        'schedules.manage',
        'bids.read',
        'bids.manage',
        'requests.read',
        'requests.create',
        'requests.read_own',
        'requests.manager_approve',
        'requests.send_to_accounting',
      ];
    }

    return ['schedules.read_own', 'bids.create', 'bids.read_own', 'requests.create', 'requests.read_own'];
  }
}
