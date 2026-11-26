import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EmployeeRequestEntity,
  EmployeeRequestEventEntity,
  EmployeeRequestStatus,
  EmployeeRequestType,
} from './requests.entities';

type CreateRequestInput = {
  employeeId: string;
  type: EmployeeRequestType;
  title: string;
  description?: string;
  startsAt?: Date;
  endsAt?: Date;
  amount?: number;
  currency?: string;
  category?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(EmployeeRequestEntity)
    private readonly requests: Repository<EmployeeRequestEntity>,
    @InjectRepository(EmployeeRequestEventEntity)
    private readonly events: Repository<EmployeeRequestEventEntity>,
  ) {}

  async create(tenantId: string, actorUserId: string | undefined, input: CreateRequestInput) {
    this.validateByType(input);

    const request = await this.requests.save(
      this.requests.create({
        ...input,
        tenantId,
        employeeId: input.employeeId ?? actorUserId,
        status: EmployeeRequestStatus.Submitted,
      }),
    );

    await this.logEvent(tenantId, request.id, actorUserId, 'request.submitted', {
      type: request.type,
      title: request.title,
    });

    return request;
  }

  list(tenantId: string, status?: EmployeeRequestStatus, type?: EmployeeRequestType) {
    return this.requests.find({
      where: {
        tenantId,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  listMine(tenantId: string, employeeId: string) {
    return this.requests.find({
      where: { tenantId, employeeId },
      order: { createdAt: 'DESC' },
    });
  }

  async managerApprove(tenantId: string, requestId: string, managerId: string | undefined, comment?: string) {
    const request = await this.requests.findOneByOrFail({ tenantId, id: requestId });
    this.assertStatus(request, [EmployeeRequestStatus.Submitted]);

    request.status = EmployeeRequestStatus.ManagerApproved;
    request.managerId = managerId;
    request.managerComment = comment;
    request.managerReviewedAt = new Date();

    await this.requests.save(request);
    await this.logEvent(tenantId, request.id, managerId, 'request.manager_approved', { comment });
    return request;
  }

  async managerReject(tenantId: string, requestId: string, managerId: string | undefined, comment?: string) {
    const request = await this.requests.findOneByOrFail({ tenantId, id: requestId });
    this.assertStatus(request, [EmployeeRequestStatus.Submitted]);

    request.status = EmployeeRequestStatus.ManagerRejected;
    request.managerId = managerId;
    request.managerComment = comment;
    request.managerReviewedAt = new Date();

    await this.requests.save(request);
    await this.logEvent(tenantId, request.id, managerId, 'request.manager_rejected', { comment });
    return request;
  }

  async sendToAccounting(tenantId: string, requestId: string, actorUserId: string | undefined) {
    const request = await this.requests.findOneByOrFail({ tenantId, id: requestId });
    this.assertStatus(request, [EmployeeRequestStatus.ManagerApproved]);

    if (request.type === EmployeeRequestType.Leave) {
      throw new BadRequestException('Leave requests do not require accounting transfer.');
    }

    request.status = EmployeeRequestStatus.SentToAccounting;
    request.sentToAccountingAt = new Date();

    await this.requests.save(request);
    await this.logEvent(tenantId, request.id, actorUserId, 'request.sent_to_accounting', {});
    return request;
  }

  async accountingApprove(tenantId: string, requestId: string, accountingUserId: string | undefined, comment?: string) {
    const request = await this.requests.findOneByOrFail({ tenantId, id: requestId });
    this.assertStatus(request, [EmployeeRequestStatus.SentToAccounting]);

    request.status = EmployeeRequestStatus.AccountingApproved;
    request.accountingUserId = accountingUserId;
    request.accountingComment = comment;
    request.accountingReviewedAt = new Date();

    await this.requests.save(request);
    await this.logEvent(tenantId, request.id, accountingUserId, 'request.accounting_approved', { comment });
    return request;
  }

  async markPaid(tenantId: string, requestId: string, accountingUserId: string | undefined) {
    const request = await this.requests.findOneByOrFail({ tenantId, id: requestId });
    this.assertStatus(request, [EmployeeRequestStatus.AccountingApproved]);

    request.status = EmployeeRequestStatus.Paid;
    request.accountingUserId = accountingUserId;
    request.paidAt = new Date();

    await this.requests.save(request);
    await this.logEvent(tenantId, request.id, accountingUserId, 'request.paid', {});
    return request;
  }

  eventsForRequest(tenantId: string, requestId: string) {
    return this.events.find({ where: { tenantId, requestId }, order: { createdAt: 'ASC' } });
  }

  private validateByType(input: CreateRequestInput) {
    if (input.type === EmployeeRequestType.Leave && (!input.startsAt || !input.endsAt)) {
      throw new BadRequestException('Leave requests require startsAt and endsAt.');
    }

    if ([EmployeeRequestType.Expense, EmployeeRequestType.Advance].includes(input.type) && !input.amount) {
      throw new BadRequestException('Expense and advance requests require amount.');
    }

    if (input.type === EmployeeRequestType.WorkPreference && !input.metadata?.preferredDates) {
      throw new BadRequestException('Work preference requests require preferredDates metadata.');
    }
  }

  private assertStatus(request: EmployeeRequestEntity, allowed: EmployeeRequestStatus[]) {
    if (!allowed.includes(request.status)) {
      throw new BadRequestException(`Invalid workflow state: ${request.status}.`);
    }
  }

  private logEvent(
    tenantId: string,
    requestId: string,
    actorUserId: string | undefined,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    return this.events.save(
      this.events.create({
        tenantId,
        requestId,
        actorUserId,
        eventType,
        payload,
      }),
    );
  }
}
