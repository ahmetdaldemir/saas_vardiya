import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../core/permission.guard';
import { RequirePermissions, TenantContext, TenantRequestContext } from '../core/tenant-context';
import { TenantGuard } from '../core/tenant.guard';
import { BiddingService } from './bidding.service';

@ApiTags('bidding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
@Controller('bid-windows')
export class BiddingController {
  constructor(private readonly bidding: BiddingService) {}

  @Post()
  @RequirePermissions('bids.manage')
  createBidWindow(@TenantContext() context: TenantRequestContext, @Body() body: Record<string, unknown>) {
    return this.bidding.createBidWindow(context.tenantId, body);
  }

  @Get()
  @RequirePermissions('bids.read')
  listBidWindows(@TenantContext() context: TenantRequestContext) {
    return this.bidding.listBidWindows(context.tenantId);
  }

  @Post(':id/bids')
  @RequirePermissions('bids.create')
  submitBids(
    @TenantContext() context: TenantRequestContext,
    @Param('id') bidWindowId: string,
    @Body() body: { employeeId?: string; bids: Record<string, unknown>[] },
  ) {
    return this.bidding.submitBids(context.tenantId, bidWindowId, body.employeeId ?? context.userId!, body.bids);
  }

  @Get(':id/bids')
  @RequirePermissions('bids.read')
  listBids(@TenantContext() context: TenantRequestContext, @Param('id') bidWindowId: string) {
    return this.bidding.listBids(context.tenantId, bidWindowId);
  }

  @Post(':id/generate-awards')
  @RequirePermissions('bids.manage')
  generateAwards(@TenantContext() context: TenantRequestContext, @Param('id') bidWindowId: string) {
    return this.bidding.generateAwards(context.tenantId, bidWindowId);
  }

  @Get(':id/awards')
  @RequirePermissions('bids.read')
  listAwards(@TenantContext() context: TenantRequestContext, @Param('id') bidWindowId: string) {
    return this.bidding.listAwards(context.tenantId, bidWindowId);
  }

  @Get(':id/decision-logs')
  @RequirePermissions('bids.read')
  listDecisionLogs(@TenantContext() context: TenantRequestContext, @Param('id') bidWindowId: string) {
    return this.bidding.listDecisionLogs(context.tenantId, bidWindowId);
  }
}
