import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('crm/tasks')
@Public()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  async create(@Body() data: any, @Request() req: any) {
    data.assignedBy = req.user.id;
    if (!data.assignedTo) {
      data.assignedTo = req.user.id;
    }
    return await this.taskService.create(data);
  }

  @Get()
  async findAll(@Query() query: any, @Request() req: any) {
    const filters: any = {};
    
    if (query.my === 'true') {
      filters.assignedTo = req.user.id;
    } else if (query.assignedTo) {
      filters.assignedTo = query.assignedTo;
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
  async getStats(@Request() req: any, @Query('userId') userId?: number) {
    return await this.taskService.getTaskStats(userId || req.user.id);
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
