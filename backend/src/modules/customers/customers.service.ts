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
      // Check if email already exists
      const existing = await this.customersRepository.findOne({ 
        where: { email: createCustomerDto.email } 
      });
      
      if (existing) {
        throw new Error('Email already exists');
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
