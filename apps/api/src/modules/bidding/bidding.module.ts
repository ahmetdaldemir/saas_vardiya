import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PermissionGuard } from '../core/permission.guard';
import { TenantGuard } from '../core/tenant.guard';
import { SchedulingScoringService } from '../scheduling/scoring.service';
import { ShiftEntity } from '../scheduling/scheduling.entities';
import { BiddingController } from './bidding.controller';
import {
  BidAwardEntity,
  BidDecisionLogEntity,
  BidWindowEntity,
  EmployeeFairnessSnapshotEntity,
  ShiftBidEntity,
} from './bidding.entities';
import { BiddingService } from './bidding.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      BidWindowEntity,
      ShiftBidEntity,
      BidAwardEntity,
      EmployeeFairnessSnapshotEntity,
      BidDecisionLogEntity,
      ShiftEntity,
    ]),
  ],
  controllers: [BiddingController],
  providers: [BiddingService, SchedulingScoringService, TenantGuard, PermissionGuard],
})
export class BiddingModule {}
