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

  async findByEmail(email: string) {
    if (!email) return null;
    return this.customersRepository.findOne({ where: { email } });
  }

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
    const patch: any = { ...updateCustomerDto };

    if (Object.prototype.hasOwnProperty.call(patch, 'phone')) {
      const phone = typeof patch.phone === 'string' ? patch.phone.trim() : '';
      if (!phone) {
        throw new Error('Phone number is required');
      }

      // Enforce uniqueness (ignore self)
      const existingPhone = await this.customersRepository.findOne({ where: { phone } });
      if (existingPhone && existingPhone.id !== id) {
        throw new Error('Phone number already exists');
      }

      patch.phone = phone;
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'email')) {
      const email = typeof patch.email === 'string' ? patch.email.trim() : null;
      patch.email = email && email.length > 0 ? email : null;

      if (patch.email) {
        const existingEmail = await this.customersRepository.findOne({ where: { email: patch.email } });
        if (existingEmail && existingEmail.id !== id) {
          throw new Error('Email already exists');
        }
      }
    }

    if (patch.password) {
      patch.password = await bcrypt.hash(patch.password, 10);
    }

    await this.customersRepository.update(id, patch);
    return this.findOne(id);
  }

  async remove(id: string) {
    return this.customersRepository.delete(id);
  }
}
