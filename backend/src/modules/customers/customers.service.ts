import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
  ) {}

  async findAll() {
    return this.customersRepository.find();
  }

  async findOne(id: string) {
    return this.customersRepository.findOne({ where: { id } });
  }

  async create(createCustomerDto: any) {
    try {
      const email =
        typeof createCustomerDto.email === 'string'
          ? createCustomerDto.email.trim()
          : null;
      const phone =
        typeof createCustomerDto.phone === 'string'
          ? createCustomerDto.phone.trim()
          : '';

      if (!phone) {
        throw new Error('Phone number is required');
      }

      // Normalize empty email to null to avoid unique collisions on ''
      createCustomerDto.email = email && email.length > 0 ? email : null;
      createCustomerDto.phone = phone;

      // Check if phone already exists (mandatory + login identifier)
      const existingPhone = await this.customersRepository.findOne({
        where: { phone },
      });
      if (existingPhone) {
        throw new Error('Phone number already exists');
      }

      // Check if email already exists (only when provided)
      if (createCustomerDto.email) {
        const existingEmail = await this.customersRepository.findOne({
          where: { email: createCustomerDto.email },
        });
        if (existingEmail) {
          throw new Error('Email already exists');
        }
      }

      // Hash password if provided
      if (createCustomerDto.password) {
        createCustomerDto.password = await bcrypt.hash(createCustomerDto.password, 10);
      }
      
      const customer = this.customersRepository.create(createCustomerDto);
      return this.customersRepository.save(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async update(id: string, updateCustomerDto: any) {
    await this.customersRepository.update(id, updateCustomerDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    return this.customersRepository.delete(id);
  }
}
