const fs = require('fs');
const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../tsconfig.json');
require('reflect-metadata');
require('ts-node/register');

const bcrypt = require('bcryptjs');
const { DataSource } = require('typeorm');
const {
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
  UserStatus,
  UserType,
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

const firstNames = [
  'Ahmet',
  'Mehmet',
  'Ayse',
  'Fatma',
  'Zeynep',
  'Elif',
  'Murat',
  'Emre',
  'Can',
  'Deniz',
  'Burak',
  'Selin',
  'Ece',
  'Kerem',
  'Merve',
  'Onur',
  'Hakan',
  'Cem',
  'Aylin',
  'Yasemin',
];

const lastNames = [
  'Yilmaz',
  'Kaya',
  'Demir',
  'Celik',
  'Sahin',
  'Yildiz',
  'Arslan',
  'Dogan',
  'Aydin',
  'Ozdemir',
];

const airlineJobs = ['Kaptan', 'First Officer', 'Kabin Memuru', 'Purser', 'Reserve Crew'];
const corporateJobs = ['Operasyon Uzmani', 'Destek Uzmani', 'Takim Lideri', 'Planlama Uzmani'];
const hospitalJobs = ['Doktor', 'Hemsire', 'Teknisyen', 'On-call Uzman'];

function jobsForIndustry(industry) {
  if (industry === 'airline') return airlineJobs;
  if (industry === 'hospital') return hospitalJobs;
  return corporateJobs;
}

async function main() {
  loadEnv();

  const tenantSlug = process.env.SEED_PERSONNEL_TENANT_SLUG || 'test1';
  const count = Number(process.env.SEED_PERSONNEL_COUNT || 50);
  const defaultPassword = process.env.SEED_PERSONNEL_PASSWORD || 'Personel123!';

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
      EmployeeProfileEntity,
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
  const profiles = dataSource.getRepository(EmployeeProfileEntity);

  const tenant = await tenants.findOne({ where: { slug: tenantSlug } });
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  const jobs = jobsForIndustry(tenant.industry);
  const passwordHash = await bcrypt.hash(defaultPassword, 12);
  let created = 0;
  let updated = 0;

  for (let index = 1; index <= count; index += 1) {
    const padded = String(index).padStart(3, '0');
    const firstName = firstNames[(index - 1) % firstNames.length];
    const lastName = lastNames[(index - 1) % lastNames.length];
    const email = `personel${padded}@${tenant.slug}.local`;
    const jobTitle = jobs[(index - 1) % jobs.length];

    let user = await users.findOne({ where: { tenantId: tenant.id, email } });
    if (!user) {
      user = await users.save(
        users.create({
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName,
          lastName,
          userType: UserType.Employee,
          status: UserStatus.Active,
        }),
      );
      created += 1;
    } else {
      user.passwordHash = passwordHash;
      user.firstName = firstName;
      user.lastName = lastName;
      user.userType = UserType.Employee;
      user.status = UserStatus.Active;
      await users.save(user);
      updated += 1;
    }

    let profile = await profiles.findOne({ where: { tenantId: tenant.id, userId: user.id } });
    if (!profile) {
      profile = profiles.create({ tenantId: tenant.id, userId: user.id });
    }

    profile.employeeNumber = `${tenant.slug.toUpperCase()}-${padded}`;
    profile.identityNumber = `1000000${String(index).padStart(4, '0')}`;
    profile.phone = `+90555000${String(index).padStart(4, '0')}`;
    profile.jobTitle = jobTitle;
    profile.employmentType = index % 5 === 0 ? 'part_time' : 'full_time';
    profile.startDate = `2025-${String((index % 12) + 1).padStart(2, '0')}-01`;
    profile.birthDate = `199${index % 10}-01-15`;
    profile.address = `Dummy adres ${index}, Istanbul`;
    profile.emergencyContactName = `Acil Kisi ${index}`;
    profile.emergencyContactPhone = `+90555999${String(index).padStart(4, '0')}`;
    profile.bankIban = `TR${String(100000000000000000000000 + index).slice(0, 24)}`;
    profile.salaryAmount = 35000 + index * 500;
    profile.salaryCurrency = 'TRY';
    profile.salaryPeriod = 'monthly';
    profile.documents = {
      identity: 'dummy',
      contract: 'dummy',
      healthReport: tenant.industry === 'airline' || tenant.industry === 'hospital' ? 'required' : 'optional',
    };

    await profiles.save(profile);
  }

  await dataSource.destroy();

  console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`Industry: ${tenant.industry}`);
  console.log(`Personnel target: ${count}`);
  console.log(`Created users: ${created}`);
  console.log(`Updated users: ${updated}`);
  console.log(`Default password: ${defaultPassword}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
