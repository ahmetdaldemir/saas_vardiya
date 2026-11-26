const fs = require('fs');
const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../tsconfig.json');
require('reflect-metadata');
require('ts-node/register');

const bcrypt = require('bcryptjs');
const { DataSource } = require('typeorm');
const {
  TenantEntity,
  UserEntity,
  UserType,
  UserStatus,
  OrganizationEntity,
  DepartmentEntity,
  LocationEntity,
  RoleEntity,
  PermissionEntity,
  UserRoleEntity,
  RolePermissionEntity,
  FeatureFlagEntity,
  AuditLogEntity,
} = require('../src/modules/core/core.entities');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../../.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('Missing root .env file.');
  }

  const rows = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const row of rows) {
    if (!row || row.trim().startsWith('#')) continue;
    const [key, ...valueParts] = row.split('=');
    if (!key || valueParts.length === 0) continue;
    process.env[key.trim()] = valueParts.join('=').trim();
  }
}

async function main() {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in .env.');
  }

  const tenantSlug = process.env.SEED_TENANT_SLUG || 'demo';
  const tenantName = process.env.SEED_TENANT_NAME || 'Demo Company';
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@smartshift.local').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    synchronize: true,
    entities: [
      TenantEntity,
      OrganizationEntity,
      DepartmentEntity,
      LocationEntity,
      UserEntity,
      RoleEntity,
      PermissionEntity,
      UserRoleEntity,
      RolePermissionEntity,
      FeatureFlagEntity,
      AuditLogEntity,
    ],
  });

  await dataSource.initialize();

  const tenants = dataSource.getRepository(TenantEntity);
  const users = dataSource.getRepository(UserEntity);

  let tenant = await tenants.findOne({ where: { slug: tenantSlug } });
  if (!tenant) {
    tenant = await tenants.save(
      tenants.create({
        slug: tenantSlug,
        name: tenantName,
        industry: process.env.SEED_TENANT_INDUSTRY || 'corporate',
        plan: 'starter',
        status: 'active',
        timezone: process.env.SEED_TENANT_TIMEZONE || 'Europe/Istanbul',
      }),
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  let admin = await users.findOne({ where: { tenantId: tenant.id, email: adminEmail } });

  if (!admin) {
    admin = users.create({
      tenantId: tenant.id,
      email: adminEmail,
      passwordHash,
      firstName: process.env.SEED_ADMIN_FIRST_NAME || 'System',
      lastName: process.env.SEED_ADMIN_LAST_NAME || 'Admin',
      userType: UserType.Admin,
      status: UserStatus.Active,
    });
  } else {
    admin.passwordHash = passwordHash;
    admin.userType = UserType.Admin;
    admin.status = UserStatus.Active;
  }

  await users.save(admin);
  await dataSource.destroy();

  console.log('Admin seed completed.');
  console.log(`Tenant slug: ${tenantSlug}`);
  console.log(`Admin email: ${adminEmail}`);
  console.log(`Admin password: ${adminPassword}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
