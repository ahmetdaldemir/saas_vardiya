import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('bid_windows')
export class BidWindowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  schedulePeriodId: string;

  @Column()
  name: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'timestamptz' })
  opensAt: Date;

  @Column({ type: 'timestamptz' })
  closesAt: Date;

  @Column({ type: 'jsonb', default: {} })
  rules: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('shift_bids')
export class ShiftBidEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  bidWindowId: string;

  @Column('uuid')
  shiftId: string;

  @Column('uuid')
  employeeId: string;

  @Column()
  rank: number;

  @Column({ default: 'prefer' })
  bidType: string;

  @CreateDateColumn()
  submittedAt: Date;
}

@Entity('bid_awards')
export class BidAwardEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  bidWindowId: string;

  @Column('uuid')
  shiftId: string;

  @Column('uuid')
  employeeId: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'numeric' })
  score: number;

  @Column({ type: 'jsonb', default: {} })
  explanation: Record<string, unknown>;
}

@Entity('employee_fairness_snapshots')
export class EmployeeFairnessSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  employeeId: string;

  @Column('uuid')
  schedulePeriodId: string;

  @Column({ type: 'numeric', default: 0 })
  assignedHours: number;

  @Column({ default: 0 })
  preferredShiftsAwarded: number;

  @Column({ default: 0 })
  undesirableShiftsAssigned: number;

  @Column({ type: 'numeric', default: 50 })
  fairnessScore: number;
}

@Entity('bid_decision_logs')
export class BidDecisionLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  bidWindowId: string;

  @Column('uuid')
  shiftId: string;

  @Column('uuid')
  employeeId: string;

  @Column()
  decision: string;

  @Column({ type: 'numeric' })
  score: number;

  @Column({ type: 'jsonb' })
  scoreBreakdown: Record<string, unknown>;

  @Column()
  explanation: string;

  @CreateDateColumn()
  createdAt: Date;
}
