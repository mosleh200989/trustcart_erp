import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private safeSelectFields(alias: string) {
    return [
      `${alias}.id`,
      `${alias}.uuid`,
      `${alias}.name`,
      `${alias}.lastName`,
      `${alias}.email`,
      `${alias}.phone`,
      `${alias}.roleId`,
      `${alias}.departmentId`,
      `${alias}.teamLeaderId`,
      `${alias}.teamId`,
      `${alias}.status`,
      `${alias}.avatarUrl`,
      `${alias}.twoFactorEnabled`,
      `${alias}.lastLogin`,
      `${alias}.isDeleted`,
      `${alias}.createdAt`,
      `${alias}.updatedAt`,
    ];
  }

  async findAllSafe() {
    return this.usersRepository
      .createQueryBuilder('u')
      .select(this.safeSelectFields('u'))
      .getMany();
  }

  async findOneSafe(id: number) {
    return this.usersRepository
      .createQueryBuilder('u')
      .select(this.safeSelectFields('u'))
      .where('u.id = :id', { id })
      .getOne();
  }

  async findOne(id: number) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(createUserDto: any) {
    const nextDto = { ...createUserDto };

    if (typeof nextDto.password === 'string' && nextDto.password.trim().length > 0) {
      nextDto.password = await bcrypt.hash(nextDto.password, 10);
    }

    const user = this.usersRepository.create(nextDto);
    return this.usersRepository.save(user);
  }

  async update(id: number, updateUserDto: any) {
    const nextDto = { ...updateUserDto };

    if (typeof nextDto.password === 'string') {
      if (nextDto.password.trim().length === 0) {
        delete nextDto.password;
      } else {
        nextDto.password = await bcrypt.hash(nextDto.password, 10);
      }
    }

    await this.usersRepository.update(id, nextDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.usersRepository.delete(id);
  }
}
