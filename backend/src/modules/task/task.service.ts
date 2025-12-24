import { Injectable } from '@nestjs/common';

@Injectable()
export class TaskService {
  async findAll() {
    return { message: 'Retrieve all tasks' };
  }

  async findOne(id: string) {
    return { id, message: 'Retrieve task by ID' };
  }

  async create(dto: any) {
    return { ...dto, id: 'new-id', createdAt: new Date() };
  }

  async update(id: string, dto: any) {
    return { id, ...dto, updatedAt: new Date() };
  }

  async remove(id: string) {
    return { id, message: 'Task deleted' };
  }
}
