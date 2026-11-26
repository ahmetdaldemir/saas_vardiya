import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { UserEntity } from '../core/core.entities';
import {
  EmployeeAvailabilityEntity,
  ScheduleConflictEntity,
  SchedulePeriodEntity,
  ShiftAssignmentEntity,
  ShiftEntity,
} from './scheduling.entities';
import { SchedulingScoringService } from './scoring.service';

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(SchedulePeriodEntity) private readonly periods: Repository<SchedulePeriodEntity>,
    @InjectRepository(ShiftEntity) private readonly shifts: Repository<ShiftEntity>,
    @InjectRepository(ShiftAssignmentEntity) private readonly assignments: Repository<ShiftAssignmentEntity>,
    @InjectRepository(EmployeeAvailabilityEntity) private readonly availability: Repository<EmployeeAvailabilityEntity>,
    @InjectRepository(ScheduleConflictEntity) private readonly conflicts: Repository<ScheduleConflictEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly scoring: SchedulingScoringService,
  ) {}

  createPeriod(tenantId: string, payload: Partial<SchedulePeriodEntity>) {
    return this.periods.save(this.periods.create({ ...payload, tenantId }));
  }

  listPeriods(tenantId: string) {
    return this.periods.find({ where: { tenantId }, order: { startsAt: 'DESC' } });
  }

  createShift(tenantId: string, payload: Partial<ShiftEntity>) {
    return this.shifts.save(this.shifts.create({ ...payload, tenantId }));
  }

  listShifts(tenantId: string, schedulePeriodId?: string) {
    return this.shifts.find({ where: { tenantId, ...(schedulePeriodId ? { schedulePeriodId } : {}) } });
  }

  createAvailability(tenantId: string, payload: Partial<EmployeeAvailabilityEntity>) {
    return this.availability.save(this.availability.create({ ...payload, tenantId }));
  }

  async assignShift(tenantId: string, shiftId: string, employeeId: string, source = 'manual') {
    const shift = await this.shifts.findOneByOrFail({ tenantId, id: shiftId });
    const conflict = await this.detectEmployeeConflict(tenantId, shift, employeeId);
    const scored = this.scoring.scoreAssignment({
      seniorityScore: 50,
      preferenceMatchScore: 0,
      overworkPenalty: conflict ? 100 : 0,
      fairnessBalanceScore: 50,
      conflictPenalty: conflict ? 1000 : 0,
      hardConflictDetected: Boolean(conflict),
    });

    if (!scored.eligible) {
      await this.conflicts.save(
        this.conflicts.create({
          tenantId,
          schedulePeriodId: shift.schedulePeriodId,
          shiftId,
          employeeId,
          ruleKey: conflict?.ruleKey ?? 'hard_conflict',
          severity: 'hard',
          message: conflict?.message ?? 'Assignment violates a hard scheduling rule.',
        }),
      );
      return scored;
    }

    return this.assignments.save(
      this.assignments.create({
        tenantId,
        shiftId,
        employeeId,
        assignmentSource: source,
        score: scored.score,
      }),
    );
  }

  async generateSchedule(tenantId: string, schedulePeriodId: string) {
    const shifts = await this.shifts.find({ where: { tenantId, schedulePeriodId, status: 'open' } });
    const employees = await this.users.find({ where: { tenantId } });
    const assignments: ShiftAssignmentEntity[] = [];

    for (const shift of shifts.sort((a, b) => b.requiredEmployeeCount - a.requiredEmployeeCount)) {
      for (const employee of employees) {
        const result = await this.assignShift(tenantId, shift.id, employee.id, 'auto_greedy');
        if ('id' in result) {
          assignments.push(result);
          break;
        }
      }
    }

    return {
      strategy: 'greedy',
      schedulePeriodId,
      assignmentsCreated: assignments.length,
    };
  }

  listConflicts(tenantId: string, schedulePeriodId: string) {
    return this.conflicts.find({ where: { tenantId, schedulePeriodId }, order: { createdAt: 'DESC' } });
  }

  private async detectEmployeeConflict(tenantId: string, shift: ShiftEntity, employeeId: string) {
    const overlapping = await this.assignments
      .createQueryBuilder('assignment')
      .innerJoin(ShiftEntity, 'shift', 'shift.id = assignment.shiftId')
      .where('assignment.tenantId = :tenantId', { tenantId })
      .andWhere('assignment.employeeId = :employeeId', { employeeId })
      .andWhere('shift.startsAt < :endsAt', { endsAt: shift.endsAt })
      .andWhere('shift.endsAt > :startsAt', { startsAt: shift.startsAt })
      .getOne();

    if (overlapping) {
      return {
        ruleKey: 'no_overlapping_shifts',
        message: 'Employee already has an overlapping shift.',
      };
    }

    const unavailable = await this.availability.findOne({
      where: {
        tenantId,
        employeeId,
        availabilityType: 'unavailable',
        startsAt: LessThan(shift.endsAt),
        endsAt: MoreThan(shift.startsAt),
      },
    });

    if (unavailable) {
      return {
        ruleKey: 'employee_available_for_shift',
        message: 'Employee is unavailable for this shift.',
      };
    }

    return null;
  }
}
