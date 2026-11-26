import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('schedule_periods')
export class SchedulePeriodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ default: 'draft' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('shifts')
export class ShiftEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  schedulePeriodId: string;

  @Column('uuid')
  locationId: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId?: string;

  @Column()
  roleKey: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ default: 1 })
  requiredEmployeeCount: number;

  @Column({ default: 'open' })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}

@Entity('employee_availability')
export class EmployeeAvailabilityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  employeeId: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column()
  availabilityType: string;

  @Column({ nullable: true })
  reason?: string;
}

@Entity('employee_seniority')
export class EmployeeSeniorityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  employeeId: string;

  @Column({ type: 'date' })
  seniorityDate: string;

  @Column({ nullable: true })
  seniorityRank?: number;

  @Column({ type: 'numeric', default: 0 })
  points: number;
}

@Entity('shift_assignments')
export class ShiftAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  shiftId: string;

  @Column('uuid')
  employeeId: string;

  @Column({ default: 'assigned' })
  status: string;

  @Column({ default: 'manual' })
  assignmentSource: string;

  @Column({ type: 'numeric', nullable: true })
  score?: number;

  @Column({ nullable: true })
  overrideReason?: string;
}

@Entity('schedule_conflicts')
export class ScheduleConflictEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  schedulePeriodId: string;

  @Column({ type: 'uuid', nullable: true })
  shiftId?: string;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string;

  @Column()
  ruleKey: string;

  @Column()
  severity: string;

  @Column()
  message: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
