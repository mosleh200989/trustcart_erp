import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('crm/workflows')
@Public()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  getAllWorkflows() {
    return this.workflowService.getAllWorkflows();
  }

  @Get(':id')
  getWorkflowById(@Param('id') id: number) {
    return this.workflowService.getWorkflowById(id);
  }

  @Post()
  async createWorkflow(@Body() data: any, @Request() req: any) {
    try {
      const userId = req.user?.id || req.user?.userId || null;
      return await this.workflowService.createWorkflow(data, userId);
    } catch (error) {
      throw new Error(`Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Put(':id')
  updateWorkflow(@Param('id') id: number, @Body() data: any) {
    return this.workflowService.updateWorkflow(id, data);
  }

  @Delete(':id')
  deleteWorkflow(@Param('id') id: number) {
    return this.workflowService.deleteWorkflow(id);
  }

  @Put(':id/toggle')
  toggleWorkflow(@Param('id') id: number, @Body('isActive') isActive: boolean) {
    return this.workflowService.toggleWorkflow(id, isActive);
  }

  @Post(':id/execute')
  executeWorkflow(@Param('id') id: number, @Body() triggerData: any) {
    return this.workflowService.executeWorkflow(id, triggerData);
  }

  @Get(':id/executions')
  getWorkflowExecutions(@Param('id') id: number, @Query('limit') limit?: number) {
    return this.workflowService.getWorkflowExecutions(id, limit);
  }

  @Get(':id/stats')
  getWorkflowStats(@Param('id') id: number) {
    return this.workflowService.getWorkflowStats(id);
  }

  @Post('trigger')
  triggerWorkflowsByEvent(
    @Body('triggerType') triggerType: string,
    @Body('triggerData') triggerData: any
  ) {
    return this.workflowService.triggerWorkflowsByEvent(triggerType, triggerData);
  }
}
