import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
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
      `${alias}.paymentMethod`,
      `${alias}.bkashNumber`,
      `${alias}.nagadNumber`,
      `${alias}.rocketNumber`,
      `${alias}.bankName`,
      `${alias}.bankAccountHolder`,
      `${alias}.bankAccountNumber`,
      `${alias}.bankBranchName`,
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
      .where('u.isDeleted = false')
      .getMany();
  }

  async findOneSafe(id: number) {
    return this.usersRepository
      .createQueryBuilder('u')
      .select(this.safeSelectFields('u'))
      .where('u.id = :id', { id })
      .andWhere('u.isDeleted = false')
      .getOne();
  }

  async findOne(id: number) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email, isDeleted: false } });
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
    const existing = await this.findOne(id);
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('User not found');
    }

    const nextDto = { ...updateUserDto };

    if (typeof nextDto.password === 'string') {
      if (nextDto.password.trim().length === 0) {
        delete nextDto.password;
      } else {
        nextDto.password = await bcrypt.hash(nextDto.password, 10);
      }
    }

    // Auto-unassign customers when agent is deactivated or suspended
    let unassignedCount = 0;
    const isBeingDeactivated =
      (nextDto.status === 'inactive' || nextDto.status === 'suspended') &&
      existing.status === 'active';

    if (isBeingDeactivated) {
      const result = await this.dataSource.query(
        `UPDATE customers SET assigned_to = NULL WHERE assigned_to = $1`,
        [id],
      );
      unassignedCount = result?.[1] ?? 0;
      if (unassignedCount > 0) {
        this.logger.log(`Unassigned ${unassignedCount} customers from deactivated user #${id} (${existing.name})`);
      }
    }

    await this.usersRepository.update(id, nextDto);
    const updated = await this.findOne(id);
    return { ...updated, unassignedCount };
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    // Unassign all customers before deactivating
    const result = await this.dataSource.query(
      `UPDATE customers SET assigned_to = NULL WHERE assigned_to = $1`,
      [id],
    );
    const unassignedCount = result?.[1] ?? 0;
    if (unassignedCount > 0) {
      this.logger.log(`Unassigned ${unassignedCount} customers from deleted user #${id} (${user.name})`);
    }

    const timestamp = Date.now();
    const safeDomain = 'trustcart.local';
    const anonymizedEmail = `deleted+${id}.${timestamp}@${safeDomain}`;

    await this.usersRepository.update(id, {
      isDeleted: true,
      status: 'inactive',
      email: anonymizedEmail,
      phone: null,
    });

    return { success: true, message: 'User deactivated', unassignedCount };
  }
}
