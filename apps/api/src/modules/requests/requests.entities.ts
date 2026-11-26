import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum EmployeeRequestType {
  Leave = 'leave',
  Expense = 'expense',
  Advance = 'advance',
  WorkPreference = 'work_preference',
}

export enum EmployeeRequestStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  ManagerApproved = 'manager_approved',
  ManagerRejected = 'manager_rejected',
  SentToAccounting = 'sent_to_accounting',
  AccountingApproved = 'accounting_approved',
  Paid = 'paid',
  Cancelled = 'cancelled',
}

@Entity('employee_requests')
export class EmployeeRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  employeeId: string;

  @Column({ type: 'enum', enum: EmployeeRequestType })
  type: EmployeeRequestType;

  @Column({ type: 'enum', enum: EmployeeRequestStatus, default: EmployeeRequestStatus.Submitted })
  status: EmployeeRequestStatus;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt?: Date;

  @Column({ type: 'numeric', nullable: true })
  amount?: number;

  @Column({ nullable: true })
  currency?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  managerId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  managerReviewedAt?: Date;

  @Column({ nullable: true })
  managerComment?: string;

  @Column({ type: 'uuid', nullable: true })
  accountingUserId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentToAccountingAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  accountingReviewedAt?: Date;

  @Column({ nullable: true })
  accountingComment?: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('employee_request_events')
export class EmployeeRequestEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  requestId: string;

  @Column({ type: 'uuid', nullable: true })
  actorUserId?: string;

  @Column()
  eventType: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
