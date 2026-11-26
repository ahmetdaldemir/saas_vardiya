import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum AttendanceEventType {
  ShiftStart = 'shift_start',
  ShiftEnd = 'shift_end',
  BreakStart = 'break_start',
  BreakEnd = 'break_end',
}

@Entity('attendance_events')
export class AttendanceEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  employeeId: string;

  @Column()
  employeeName: string;

  @Column({ type: 'enum', enum: AttendanceEventType })
  type: AttendanceEventType;

  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @Column({ type: 'numeric', nullable: true })
  breakMinutes?: number;

  @Column({ default: false })
  exceededBreakLimit: boolean;

  @Column({ nullable: true })
  note?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
