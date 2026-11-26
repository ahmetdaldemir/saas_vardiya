import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlagEntity, UserEntity } from '../core/core.entities';
import { AttendanceEventEntity, AttendanceEventType } from './attendance.entities';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceEventEntity)
    private readonly events: Repository<AttendanceEventEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(FeatureFlagEntity)
    private readonly features: Repository<FeatureFlagEntity>,
  ) {}

  list(tenantId: string) {
    return this.events.find({ where: { tenantId }, order: { occurredAt: 'DESC' }, take: 200 });
  }

  listMine(tenantId: string, employeeId: string) {
    return this.events.find({ where: { tenantId, employeeId }, order: { occurredAt: 'DESC' }, take: 100 });
  }

  alerts(tenantId: string) {
    return this.events.find({
      where: { tenantId, exceededBreakLimit: true },
      order: { occurredAt: 'DESC' },
      take: 100,
    });
  }

  async createEvent(tenantId: string, employeeId: string, type: AttendanceEventType, breakLimitMinutes = 45, clientIp?: string) {
    await this.assertAllowedAttendanceIp(tenantId, clientIp);

    const user = await this.users.findOneByOrFail({ tenantId, id: employeeId });
    const employeeName = `${user.firstName} ${user.lastName}`;
    const now = new Date();
    let breakMinutes: number | undefined;
    let exceededBreakLimit = false;
    let note: string | undefined;

    if (type === AttendanceEventType.ShiftStart) {
      const activeShift = await this.hasOpenShift(tenantId, employeeId);
      if (activeShift) throw new BadRequestException('Active shift already exists.');
    }

    if (type === AttendanceEventType.BreakStart) {
      const activeShift = await this.hasOpenShift(tenantId, employeeId);
      if (!activeShift) throw new BadRequestException('Shift must be started before break.');
      const activeBreak = await this.latestUnclosedBreak(tenantId, employeeId);
      if (activeBreak) throw new BadRequestException('Active break already exists.');
    }

    if (type === AttendanceEventType.BreakEnd) {
      const activeBreak = await this.latestUnclosedBreak(tenantId, employeeId);
      if (!activeBreak) throw new BadRequestException('No active break found.');
      breakMinutes = Math.max(0, Math.round((now.valueOf() - activeBreak.occurredAt.valueOf()) / 60000));
      exceededBreakLimit = breakMinutes > breakLimitMinutes;
      note = exceededBreakLimit
        ? `Mola limiti aşıldı: ${breakMinutes}/${breakLimitMinutes} dk`
        : `Mola süresi: ${breakMinutes} dk`;
    }

    if (type === AttendanceEventType.ShiftEnd) {
      const activeShift = await this.hasOpenShift(tenantId, employeeId);
      if (!activeShift) throw new BadRequestException('No active shift found.');
    }

    return this.events.save(
      this.events.create({
        tenantId,
        employeeId,
        employeeName,
        type,
        occurredAt: now,
        breakMinutes,
        exceededBreakLimit,
        note,
      }),
    );
  }

  private async hasOpenShift(tenantId: string, employeeId: string) {
    const lastShiftStart = await this.events.findOne({
      where: { tenantId, employeeId, type: AttendanceEventType.ShiftStart },
      order: { occurredAt: 'DESC' },
    });
    const lastShiftEnd = await this.events.findOne({
      where: { tenantId, employeeId, type: AttendanceEventType.ShiftEnd },
      order: { occurredAt: 'DESC' },
    });
    return Boolean(lastShiftStart && (!lastShiftEnd || lastShiftStart.occurredAt > lastShiftEnd.occurredAt));
  }

  private async latestUnclosedBreak(tenantId: string, employeeId: string) {
    const lastBreakStart = await this.events.findOne({
      where: { tenantId, employeeId, type: AttendanceEventType.BreakStart },
      order: { occurredAt: 'DESC' },
    });
    if (!lastBreakStart) return null;

    const lastBreakEnd = await this.events.findOne({
      where: { tenantId, employeeId, type: AttendanceEventType.BreakEnd },
      order: { occurredAt: 'DESC' },
    });

    return !lastBreakEnd || lastBreakStart.occurredAt > lastBreakEnd.occurredAt ? lastBreakStart : null;
  }

  private async assertAllowedAttendanceIp(tenantId: string, clientIp?: string) {
    const setting = await this.features.findOne({ where: { tenantId, key: 'attendance_security' } });
    const config = setting?.config ?? {};
    const enforceIp = Boolean(setting?.enabled && config.enforceIp);
    if (!enforceIp) return;

    const allowedIps = Array.isArray(config.allowedIps) ? config.allowedIps.map(String).filter(Boolean) : [];
    const normalizedClientIp = this.normalizeIp(clientIp);
    if (!normalizedClientIp || !allowedIps.length) {
      throw new ForbiddenException('Mesai bildirimi için işyeri IP güvenliği aktif, ancak izinli IP tanımı bulunamadı.');
    }

    const isAllowed = allowedIps.some((allowedIp) => this.ipMatches(normalizedClientIp, allowedIp));
    if (!isAllowed) {
      throw new ForbiddenException('Bu işlem sadece tanımlı işyeri IP adresinden yapılabilir.');
    }
  }

  private normalizeIp(ip?: string) {
    if (!ip) return '';
    const firstIp = ip.split(',')[0]?.trim() ?? '';
    return firstIp.replace('::ffff:', '').replace('::1', '127.0.0.1');
  }

  private ipMatches(clientIp: string, allowedIp: string) {
    const normalizedAllowedIp = this.normalizeIp(allowedIp);
    if (!normalizedAllowedIp.includes('/')) {
      return clientIp === normalizedAllowedIp;
    }

    const [rangeIp, prefixText] = normalizedAllowedIp.split('/');
    const prefix = Number(prefixText);
    const client = this.ipToNumber(clientIp);
    const range = this.ipToNumber(rangeIp);
    if (client === null || range === null || Number.isNaN(prefix)) return false;

    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (client & mask) === (range & mask);
  }

  private ipToNumber(ip: string) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
    return parts.reduce((acc, part) => ((acc << 8) + part) >>> 0, 0);
  }
}
