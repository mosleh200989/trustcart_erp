import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';

// Helper to safely convert ID to integer
function toIntId(id: any): number | null {
  if (id === undefined || id === null || id === '') return null;
  const num = parseInt(String(id), 10);
  return isNaN(num) ? null : num;
}

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async create(data: Partial<Task>): Promise<Task> {
    // Ensure IDs are integers
    if (data.assignedTo) data.assignedTo = toIntId(data.assignedTo) as number;
    if (data.assignedBy) data.assignedBy = toIntId(data.assignedBy) as number;
    if (data.customerId) data.customerId = toIntId(data.customerId) as number;
    if (data.dealId) data.dealId = toIntId(data.dealId) as number;
    
    // Ensure tags is a proper array or null
    if (data.tags) {
      if (typeof data.tags === 'string') {
        data.tags = (data.tags as string).split(',').map(t => t.trim()).filter(t => t);
      }
      if (Array.isArray(data.tags) && data.tags.length === 0) {
        data.tags = null as any;
      }
    }
    
    const task = this.taskRepository.create(data);
    return await this.taskRepository.save(task);
  }

  async findAll(filters?: any): Promise<Task[]> {
    console.log('TaskService.findAll - filters:', JSON.stringify(filters));
    
    const query = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.assigner', 'assigner')
      .leftJoinAndSelect('task.deal', 'deal');

    if (filters?.assignedTo) {
      const assignedToId = toIntId(filters.assignedTo);
      console.log('Filtering by assignedTo:', filters.assignedTo, '-> parsed:', assignedToId);
      if (assignedToId) {
        query.andWhere('task.assignedTo = :assignedTo', { assignedTo: assignedToId });
      }
    }

    // Filter by who created/assigned the task
    if (filters?.assignedBy) {
      const assignedById = toIntId(filters.assignedBy);
      console.log('Filtering by assignedBy:', filters.assignedBy, '-> parsed:', assignedById);
      if (assignedById) {
        query.andWhere('task.assignedBy = :assignedBy', { assignedBy: assignedById });
      }
    }

    if (filters?.customerId) {
      query.andWhere('task.customerId = :customerId', { customerId: toIntId(filters.customerId) });
    }

    if (filters?.dealId) {
      query.andWhere('task.dealId = :dealId', { dealId: toIntId(filters.dealId) });
    }

    if (filters?.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters?.overdue) {
      query.andWhere('task.dueDate < :today', { today: new Date() })
        .andWhere('task.status != :completed', { completed: 'completed' });
    }

    if (filters?.dueToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      query.andWhere('task.dueDate >= :today', { today })
        .andWhere('task.dueDate < :tomorrow', { tomorrow });
    }

    query.orderBy('task.dueDate', 'ASC');

    const tasks = await query.getMany();
    console.log('TaskService.findAll - returning', tasks.length, 'tasks');
    return tasks;
  }

  async findOne(id: number): Promise<Task | null> {
    return await this.taskRepository.findOne({
      where: { id },
      relations: ['customer', 'assignee', 'assigner', 'deal'],
    });
  }

  async update(id: number, data: Partial<Task>): Promise<Task | null> {
    if (data.status === 'completed' && !data.completedAt) {
      data.completedAt = new Date();
    }
    
    await this.taskRepository.update(id, data);
    return await this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.taskRepository.delete(id);
  }

  async getTaskStats(userId?: number, assignedBy?: number): Promise<any> {
    // Convert IDs to integers safely
    const userIdInt = toIntId(userId);
    const assignedByInt = toIntId(assignedBy);

    // For team leaders, we count tasks they created (assignedBy)
    // For team members, we count tasks assigned to them (assignedTo)
    const [pending, inProgress, completed, overdue] = await Promise.all([
      this.taskRepository.createQueryBuilder('task')
        .where(assignedByInt 
          ? 'task.assignedBy = :assignedBy' 
          : userIdInt ? 'task.assignedTo = :userId' : '1=1', 
          { assignedBy: assignedByInt, userId: userIdInt })
        .andWhere('task.status = :status', { status: 'pending' })
        .getCount(),
      this.taskRepository.createQueryBuilder('task')
        .where(assignedByInt 
          ? 'task.assignedBy = :assignedBy' 
          : userIdInt ? 'task.assignedTo = :userId' : '1=1', 
          { assignedBy: assignedByInt, userId: userIdInt })
        .andWhere('task.status = :status', { status: 'in_progress' })
        .getCount(),
      this.taskRepository.createQueryBuilder('task')
        .where(assignedByInt 
          ? 'task.assignedBy = :assignedBy' 
          : userIdInt ? 'task.assignedTo = :userId' : '1=1', 
          { assignedBy: assignedByInt, userId: userIdInt })
        .andWhere('task.status = :status', { status: 'completed' })
        .getCount(),
      this.taskRepository.createQueryBuilder('task')
        .where(assignedByInt 
          ? 'task.assignedBy = :assignedBy' 
          : userIdInt ? 'task.assignedTo = :userId' : '1=1', 
          { assignedBy: assignedByInt, userId: userIdInt })
        .andWhere('task.dueDate < :today', { today: new Date() })
        .andWhere('task.status != :completed', { completed: 'completed' })
        .getCount(),
    ]);

    return {
      pending,
      inProgress,
      completed,
      overdue,
      total: pending + inProgress + completed,
    };
  }
}
