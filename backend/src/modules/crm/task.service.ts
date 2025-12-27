import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  async create(data: Partial<Task>): Promise<Task> {
    const task = this.taskRepository.create(data);
    return await this.taskRepository.save(task);
  }

  async findAll(filters?: any): Promise<Task[]> {
    const query = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.customer', 'customer')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.assigner', 'assigner')
      .leftJoinAndSelect('task.deal', 'deal');

    if (filters?.assignedTo) {
      query.andWhere('task.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters?.customerId) {
      query.andWhere('task.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters?.dealId) {
      query.andWhere('task.dealId = :dealId', { dealId: filters.dealId });
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

    return await query.getMany();
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

  async getTaskStats(userId?: number): Promise<any> {
    const baseQuery = this.taskRepository.createQueryBuilder('task');

    if (userId) {
      baseQuery.where('task.assignedTo = :userId', { userId });
    }

    const [pending, inProgress, completed, overdue] = await Promise.all([
      baseQuery.clone().where('task.status = :status', { status: 'pending' }).getCount(),
      baseQuery.clone().where('task.status = :status', { status: 'in_progress' }).getCount(),
      baseQuery.clone().where('task.status = :status', { status: 'completed' }).getCount(),
      baseQuery.clone()
        .where('task.dueDate < :today', { today: new Date() })
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
