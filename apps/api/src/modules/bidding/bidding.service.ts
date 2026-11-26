import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulingScoringService } from '../scheduling/scoring.service';
import { ShiftEntity } from '../scheduling/scheduling.entities';
import {
  BidAwardEntity,
  BidDecisionLogEntity,
  BidWindowEntity,
  EmployeeFairnessSnapshotEntity,
  ShiftBidEntity,
} from './bidding.entities';

@Injectable()
export class BiddingService {
  constructor(
    @InjectRepository(BidWindowEntity) private readonly windows: Repository<BidWindowEntity>,
    @InjectRepository(ShiftBidEntity) private readonly bids: Repository<ShiftBidEntity>,
    @InjectRepository(BidAwardEntity) private readonly awards: Repository<BidAwardEntity>,
    @InjectRepository(EmployeeFairnessSnapshotEntity) private readonly fairness: Repository<EmployeeFairnessSnapshotEntity>,
    @InjectRepository(BidDecisionLogEntity) private readonly decisions: Repository<BidDecisionLogEntity>,
    @InjectRepository(ShiftEntity) private readonly shifts: Repository<ShiftEntity>,
    private readonly scoring: SchedulingScoringService,
  ) {}

  createBidWindow(tenantId: string, payload: Partial<BidWindowEntity>) {
    return this.windows.save(this.windows.create({ ...payload, tenantId }));
  }

  listBidWindows(tenantId: string) {
    return this.windows.find({ where: { tenantId }, order: { opensAt: 'DESC' } });
  }

  submitBids(tenantId: string, bidWindowId: string, employeeId: string, bids: Partial<ShiftBidEntity>[]) {
    const rows = bids.map((bid) =>
      this.bids.create({
        ...bid,
        tenantId,
        bidWindowId,
        employeeId,
      }),
    );
    return this.bids.save(rows);
  }

  listBids(tenantId: string, bidWindowId: string) {
    return this.bids.find({ where: { tenantId, bidWindowId }, order: { rank: 'ASC' } });
  }

  async generateAwards(tenantId: string, bidWindowId: string) {
    const window = await this.windows.findOneByOrFail({ tenantId, id: bidWindowId });
    const shifts = await this.shifts.find({ where: { tenantId, schedulePeriodId: window.schedulePeriodId } });
    const bids = await this.bids.find({ where: { tenantId, bidWindowId } });
    const awards: BidAwardEntity[] = [];

    for (const shift of shifts) {
      const candidates = bids
        .filter((bid) => bid.shiftId === shift.id)
        .map((bid) => {
          const preferenceMatchScore = this.preferenceScore(bid);
          const fairnessBalanceScore = 50;
          const scored = this.scoring.scoreAssignment({
            seniorityScore: 50,
            preferenceMatchScore,
            overworkPenalty: 0,
            fairnessBalanceScore,
            conflictPenalty: 0,
          });
          return { bid, scored };
        })
        .sort((a, b) => b.scored.score - a.scored.score || a.bid.rank - b.bid.rank);

      const winner = candidates[0];
      if (!winner) {
        continue;
      }

      const award = await this.awards.save(
        this.awards.create({
          tenantId,
          bidWindowId,
          shiftId: shift.id,
          employeeId: winner.bid.employeeId,
          score: winner.scored.score,
          explanation: {
            formula: 'seniority + preference - overwork + fairness - conflict',
            breakdown: winner.scored.breakdown,
            antiBias: 'Protected attributes are excluded from the scoring context.',
          },
        }),
      );
      awards.push(award);

      await this.decisions.save(
        this.decisions.create({
          tenantId,
          bidWindowId,
          shiftId: shift.id,
          employeeId: winner.bid.employeeId,
          decision: 'awarded',
          score: winner.scored.score,
          scoreBreakdown: winner.scored.breakdown,
          explanation: `Awarded rank ${winner.bid.rank} bid using deterministic fairness scoring.`,
        }),
      );
    }

    return { bidWindowId, awardsCreated: awards.length, awards };
  }

  listAwards(tenantId: string, bidWindowId: string) {
    return this.awards.find({ where: { tenantId, bidWindowId }, order: { score: 'DESC' } });
  }

  listDecisionLogs(tenantId: string, bidWindowId: string) {
    return this.decisions.find({ where: { tenantId, bidWindowId }, order: { createdAt: 'DESC' } });
  }

  private preferenceScore(bid: ShiftBidEntity) {
    if (bid.bidType === 'avoid') {
      return -35;
    }
    const maxRank = 5;
    return Math.max(0, ((maxRank - bid.rank + 1) / maxRank) * 100);
  }
}
