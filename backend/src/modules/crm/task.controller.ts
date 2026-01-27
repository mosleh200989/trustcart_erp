import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

// Helper to safely convert ID to integer
function toIntId(id: any): number | undefined {
  if (id === undefined || id === null || id === '') return undefined;
  const num = parseInt(String(id), 10);
  return isNaN(num) ? undefined : num;
}

@Controller('crm/tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  async create(@Body() data: any, @Request() req: any) {
    // Convert user ID to integer safely
    const userId = toIntId(req.user.id);
    console.log('Task Create - req.user.id:', req.user.id, 'converted:', userId);
    data.assignedBy = userId;
    if (!data.assignedTo) {
      data.assignedTo = userId;
    }
    return await this.taskService.create(data);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    const filters: any = {};
    const userId = toIntId(req.user.id);
    console.log('Task findAll - req.user.id:', req.user.id, 'converted:', userId);
    console.log('Task findAll - query:', query);
    
    if (query.my === 'true') {
      filters.assignedTo = userId;
    } else if (query.assignedTo) {
      filters.assignedTo = query.assignedTo;
    }

    // Team leader filter: get tasks assigned to team members
    if (query.teamLeaderId) {
      filters.teamLeaderId = query.teamLeaderId;
    }

    // Filter by assigner (created by)
    if (query.assignedBy) {
      filters.assignedBy = query.assignedBy;
    }

    if (query.customerId) filters.customerId = query.customerId;
    if (query.dealId) filters.dealId = query.dealId;
    if (query.status) filters.status = query.status;
    if (query.priority) filters.priority = query.priority;
    if (query.overdue === 'true') filters.overdue = true;
    if (query.dueToday === 'true') filters.dueToday = true;

    return await this.taskService.findAll(filters);
  }

  @Get('stats')
  async getStats(@Request() req: any, @Query('userId') userId?: string, @Query('assignedBy') assignedBy?: string) {
    const userIdInt = toIntId(userId) || toIntId(req.user.id);
    const assignedByInt = toIntId(assignedBy);
    return await this.taskService.getTaskStats(userIdInt, assignedByInt);
  }

  @Get('my-team')
  async getTeamTasks(@Request() req: any, @Query() query: any) {
    // Get tasks created by this team leader for their team members
    const userId = toIntId(req.user.id);
    const filters: any = {
      assignedBy: userId,
    };

    if (query.assignedTo) filters.assignedTo = query.assignedTo;
    if (query.status) filters.status = query.status;
    if (query.priority) filters.priority = query.priority;

    return await this.taskService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.taskService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: any) {
    return await this.taskService.update(id, data);
  }

  @Put(':id/complete')
  async complete(@Param('id') id: number) {
    return await this.taskService.update(id, { status: 'completed' });
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    await this.taskService.delete(id);
    return { message: 'Task deleted successfully' };
  }
}
