import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SegmentationService } from './segmentation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('crm/segments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SegmentationController {
  constructor(private readonly segmentationService: SegmentationService) {}

  @Get()
  getAllSegments() {
    return this.segmentationService.getAllSegments();
  }

  @Get('stats')
  getSegmentStats() {
    return this.segmentationService.getSegmentStats();
  }

  @Get(':id')
  getSegmentById(@Param('id') id: number) {
    return this.segmentationService.getSegmentById(id);
  }

  @Post()
  async createSegment(@Body() data: any, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      return await this.segmentationService.createSegment(data, userId);
    } catch (error) {
      throw new Error(`Failed to create segment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put(':id')
  updateSegment(@Param('id') id: number, @Body() data: any) {
    return this.segmentationService.updateSegment(id, data);
  }

  @Delete(':id')
  deleteSegment(@Param('id') id: number) {
    return this.segmentationService.deleteSegment(id);
  }

  @Get(':id/members')
  getSegmentMembers(@Param('id') segmentId: number) {
    return this.segmentationService.getSegmentMembers(segmentId);
  }

  @Post(':id/members')
  addMemberToSegment(
    @Param('id') segmentId: number,
    @Body('customerId') customerId: number
  ) {
    return this.segmentationService.addMemberToSegment(segmentId, customerId);
  }

  @Delete(':id/members/:customerId')
  removeMemberFromSegment(
    @Param('id') segmentId: number,
    @Param('customerId') customerId: number
  ) {
    return this.segmentationService.removeMemberFromSegment(segmentId, customerId);
  }

  @Post(':id/members/bulk')
  bulkAddMembers(
    @Param('id') segmentId: number,
    @Body('customerIds') customerIds: number[]
  ) {
    return this.segmentationService.bulkAddMembers(segmentId, customerIds);
  }

  @Delete(':id/members/bulk')
  bulkRemoveMembers(
    @Param('id') segmentId: number,
    @Body('customerIds') customerIds: number[]
  ) {
    return this.segmentationService.bulkRemoveMembers(segmentId, customerIds);
  }

  @Post(':id/calculate')
  calculateDynamicSegment(@Param('id') segmentId: number) {
    return this.segmentationService.calculateDynamicSegment(segmentId);
  }

  @Get('search/customers')
  searchCustomers(@Query('q') searchTerm: string, @Query('limit') limit?: number) {
    return this.segmentationService.searchCustomersForSegment(searchTerm, limit);
  }
}
