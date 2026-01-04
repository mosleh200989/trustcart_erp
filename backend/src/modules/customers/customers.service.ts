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

  async findByPhone(phone: string) {
    const normalized = typeof phone === 'string' ? phone.trim() : '';
    if (!normalized) return null;
    return this.customersRepository.findOne({ where: { phone: normalized } });
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

      const wantsPassword =
        typeof createCustomerDto.password === 'string' &&
        createCustomerDto.password.trim().length > 0;

      if (!phone) {
        throw new Error('Phone number is required');
      }

      // Normalize empty email to null to avoid unique collisions on ''
      createCustomerDto.email = email && email.length > 0 ? email : null;
      createCustomerDto.phone = phone;

      // Check if phone already exists (mandatory + login identifier)
      // If it exists and has NO password, and this request provides a password,
      // treat it as a guest->account upgrade instead of failing.
      const existingByPhone = await this.customersRepository
        .createQueryBuilder('customer')
        .addSelect('customer.password')
        .where('customer.phone = :phone', { phone })
        .getOne();

      if (existingByPhone) {
        const existingHasPassword =
          typeof (existingByPhone as any).password === 'string' &&
          (existingByPhone as any).password.length > 0;

        if (wantsPassword && !existingHasPassword) {
          // Check email uniqueness (ignore self)
          if (createCustomerDto.email) {
            const existingEmail = await this.customersRepository.findOne({
              where: { email: createCustomerDto.email },
            });
            if (existingEmail && existingEmail.id !== existingByPhone.id) {
              throw new Error('Email already exists');
            }
          }

          const patch: any = {
            isGuest: false,
            password: await bcrypt.hash(createCustomerDto.password, 10),
          };

          if (Object.prototype.hasOwnProperty.call(createCustomerDto, 'email')) {
            patch.email = createCustomerDto.email;
          }
          if (createCustomerDto.name && (!existingByPhone.name || !existingByPhone.name.trim())) {
            patch.name = createCustomerDto.name;
          }
          if (
            createCustomerDto.lastName &&
            (!existingByPhone.lastName || !existingByPhone.lastName.trim())
          ) {
            patch.lastName = createCustomerDto.lastName;
          }
          if (createCustomerDto.customerType) patch.customerType = createCustomerDto.customerType;
          if (createCustomerDto.status) patch.status = createCustomerDto.status;
          patch.isActive = true;

          await this.customersRepository.update(existingByPhone.id, patch);
          return this.findOne(existingByPhone.id);
        }

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
      if (wantsPassword) {
        createCustomerDto.password = await bcrypt.hash(createCustomerDto.password, 10);
        createCustomerDto.isGuest = false;
      } else {
        createCustomerDto.isGuest = true;
      }
      
      const customer = this.customersRepository.create(createCustomerDto);
      return this.customersRepository.save(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async update(id: string, updateCustomerDto: any) {
    const existingCustomer = await this.customersRepository.findOne({ where: { id } });
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    const patch: any = { ...updateCustomerDto };

    if (Object.prototype.hasOwnProperty.call(patch, 'phone')) {
      const phone = typeof patch.phone === 'string' ? patch.phone.trim() : '';
      if (!phone) {
        throw new Error('Phone number is required');
      }

      // Only enforce uniqueness if the phone is being changed.
      // This avoids false positives when legacy data contains duplicates.
      if (existingCustomer.phone !== phone) {
        const existingPhone = await this.customersRepository.findOne({ where: { phone } });
        if (existingPhone && existingPhone.id !== id) {
          throw new Error('Phone number already exists');
        }
      }

      patch.phone = phone;
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'email')) {
      const email = typeof patch.email === 'string' ? patch.email.trim() : null;
      patch.email = email && email.length > 0 ? email : null;

      if (patch.email) {
        if (existingCustomer.email !== patch.email) {
          const existingEmail = await this.customersRepository.findOne({ where: { email: patch.email } });
          if (existingEmail && existingEmail.id !== id) {
            throw new Error('Email already exists');
          }
        }
      }
    }

    if (patch.password) {
      patch.password = await bcrypt.hash(patch.password, 10);
      patch.isGuest = false;
    }

    await this.customersRepository.update(id, patch);
    return this.findOne(id);
  }

  async remove(id: string) {
    return this.customersRepository.delete(id);
  }
}
